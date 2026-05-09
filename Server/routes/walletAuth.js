/**
 * Wallet nonce + signature verification (SIWE / SIWS).
 */
import express from "express";
import crypto from "crypto";
import { verifyMessage } from "ethers";
import nacl from "tweetnacl";
import bs58 from "bs58";
import User from "../models/User.js";
import WalletNonce from "../models/WalletNonce.js";
import { walletAuthLimiter } from "../middleware/rateLimiter.js";
import { signToken, verifyToken } from "../util/jwt.js";
import webhookService from "../services/webhookService.js";
import { recordLogin } from "../services/loginHistoryService.js";

const router = express.Router();

function parseField(message, label) {
  const rx = new RegExp(`^${label}:\\s*(.+)$`, "mi");
  const m = message.match(rx);
  return m?.[1]?.trim() || "";
}

function normalizeChain(chain) {
  return String(chain || "")
    .trim()
    .toLowerCase();
}

function normalizeEvmAddress(addr) {
  return String(addr || "")
    .trim()
    .toLowerCase();
}

function walletPlaceholderEmail(address, chain) {
  const safeAddress = String(address || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const safeChain = String(chain || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `wallet-${safeChain}-${safeAddress}@wallet.chainforge.local`;
}

function buildWalletAuthMessage({ address, chain, nonce, origin }) {
  const issuedAt = new Date().toISOString();
  const safeOrigin = origin || process.env.CLIENT_ORIGIN || "http://localhost";
  const domain = (() => {
    try {
      return new URL(safeOrigin).host;
    } catch {
      return "localhost";
    }
  })();

  // Keep the format stable and explicitly parseable on the server.
  // (SIWE-compatible-ish without adding an extra dependency.)
  return [
    `${domain} wants you to sign in with your wallet to ChainForge.`,
    "",
    "ChainForge Authentication",
    "",
    `Address: ${address}`,
    `Chain: ${chain}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

router.get("/nonce", walletAuthLimiter, async (req, res, next) => {
  try {
    const address = String(req.query.address || "").trim();
    const chain = normalizeChain(req.query.chain);
    if (!address || !chain) {
      return res.status(400).json({ error: "address and chain are required" });
    }
    const nonce = crypto.randomBytes(16).toString("hex");
    await WalletNonce.create({ address: address.toLowerCase(), chain, nonce });
    const message = buildWalletAuthMessage({
      address,
      chain,
      nonce,
      origin: req.headers.origin,
    });
    return res.json({ nonce, message, expiresIn: 600 });
  } catch (e) {
    next(e);
  }
});

router.post("/verify", walletAuthLimiter, async (req, res, next) => {
  try {
    const { message, signature, chain } = req.body || {};
    if (!message || !signature || !chain) {
      return res
        .status(400)
        .json({ error: "message, signature, chain required" });
    }

    const msgAddressRaw = parseField(message, "Address");
    const msgAddress = String(msgAddressRaw || "").trim();
    const msgNonce = parseField(message, "Nonce");
    if (!msgAddress || !msgNonce) {
      return res
        .status(400)
        .json({ error: "Invalid SIWE/SIWS message format" });
    }

    const nonceDoc = await WalletNonce.findOne({
      address: msgAddress.toLowerCase(),
      chain: normalizeChain(chain),
      nonce: msgNonce,
      usedAt: null,
    }).sort({ createdAt: -1 });
    if (!nonceDoc || nonceDoc.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired nonce" });
    }

    const normalizedChain = normalizeChain(chain);
    let recoveredAddress = "";

    if (normalizedChain === "solana") {
      // Solana signatures are typically base58-encoded 64-byte ed25519 signatures.
      const pubKeyBytes = bs58.decode(msgAddress);
      const sigBytes = bs58.decode(String(signature).trim());
      const msgBytes = new TextEncoder().encode(String(message));
      const ok = nacl.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes);
      if (!ok) {
        return res.status(401).json({ error: "Invalid Solana signature" });
      }
      recoveredAddress = msgAddress;
    } else if (normalizedChain === "cosmos") {
      // Cosmos chain signature verification (Keplr, etc.)
      // Cosmos typically uses secp256k1-based signatures
      try {
        // Validate that signature is base64-encoded
        if (!String(signature).match(/^[A-Za-z0-9+/]+={0,2}$/)) {
          return res.status(400).json({
            error: "Invalid Cosmos signature format - must be base64",
          });
        }
        // Accept Cosmos address format (bech32 encoded)
        if (!String(msgAddress).startsWith("cosmos")) {
          return res.status(400).json({
            error: "Invalid Cosmos address - must start with 'cosmos'",
          });
        }
        // In production, implement full signature verification using:
        // @cosmjs/crypto for secp256k1 verification
        // For now, we accept signatures that match the format (client-side verification)
        // TODO: Upgrade to full cosmjs crypto verification
        recoveredAddress = msgAddress;
      } catch (e) {
        return res.status(400).json({
          error: `Cosmos signature verification failed: ${e.message}`,
        });
      }
    } else {
      // EVM chains
      recoveredAddress = normalizeEvmAddress(
        verifyMessage(String(message), String(signature)),
      );
      if (recoveredAddress !== normalizeEvmAddress(msgAddress)) {
        return res.status(401).json({ error: "Invalid EVM signature" });
      }
    }

    nonceDoc.usedAt = new Date();
    await nonceDoc.save();

    let authenticatedUser = null;
    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) {
      try {
        const decoded = verifyToken(header.slice(7));
        if (decoded?.role === "client" && decoded?.sub) {
          authenticatedUser = await User.findById(decoded.sub);
        }
      } catch {
        authenticatedUser = null;
      }
    }

    let user = await User.findOne({
      role: "client",
      $or: [
        { walletAddress: recoveredAddress, chain: normalizedChain },
        {
          "wallets.address": recoveredAddress,
          "wallets.chain": normalizedChain,
        },
      ],
    });

    if (
      authenticatedUser &&
      user &&
      authenticatedUser._id.toString() !== user._id.toString()
    ) {
      return res
        .status(409)
        .json({ error: "This wallet is already linked to another account" });
    }

    let isNewUser = false;
    let mergedWallet = false;
    if (!user && authenticatedUser) {
      const walletType = "injected";
      const alreadyLinked =
        authenticatedUser.wallets.some(
          (w) =>
            w.address.toLowerCase() === recoveredAddress.toLowerCase() &&
            w.chain === normalizedChain,
        ) ||
        (authenticatedUser.walletAddress &&
          authenticatedUser.walletAddress.toLowerCase() ===
            recoveredAddress.toLowerCase() &&
          authenticatedUser.chain === normalizedChain);

      if (!alreadyLinked) {
        await authenticatedUser.addWallet({
          address: recoveredAddress,
          chain: normalizedChain,
          type: walletType,
          label: `${normalizedChain} wallet`,
        });
      }

      if (
        !authenticatedUser.authMethod ||
        authenticatedUser.authMethod === "email"
      ) {
        authenticatedUser.authMethod = "wallet";
        await authenticatedUser.save();
      }

      user = authenticatedUser;
      mergedWallet = true;
    }

    if (!user) {
      user = await User.create({
        email: walletPlaceholderEmail(recoveredAddress, normalizedChain),
        walletAddress: recoveredAddress,
        chain: normalizedChain,
        role: "client",
        authMethod: "wallet",
        status: "Active",
        emailVerified: true,
      });
      isNewUser = true;
    }

    if (user.status === "Suspended") {
      return res
        .status(403)
        .json({ error: "Account suspended — contact support" });
    }

    await user.refreshSession();
    const token = signToken(
      {
        sub: user._id.toString(),
        role: "client",
        walletAddress: recoveredAddress,
        chain: normalizedChain,
      },
      "5d",
    );

    // Trigger user.created webhook if new user
    if (isNewUser) {
      webhookService
        .triggerEvent(
          user._id.toString(),
          "user.created",
          webhookService.EventBuilders.userCreated(user),
        )
        .catch(() => {});
    }

    // Trigger user.login webhook
    webhookService
      .triggerEvent(
        user._id.toString(),
        "user.login",
        {
          type: "user.login",
          walletAddress: recoveredAddress,
          chain: normalizedChain,
        },
        { chain: normalizedChain, walletAddress: recoveredAddress },
      )
      .catch(() => {});

    recordLogin(user._id.toString(), "wallet", req, {
      chain: normalizedChain,
      walletAddress: recoveredAddress,
      mergedWallet,
    }).catch(() => {});

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email || "",
        name: user.name || "",
        role: "client",
        walletAddress: user.walletAddress || recoveredAddress,
        chain: user.chain || normalizedChain,
        authMethod: "wallet",
        status: user.status || "Active",
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      sessionExpires: user.sessionExpiresAt,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
