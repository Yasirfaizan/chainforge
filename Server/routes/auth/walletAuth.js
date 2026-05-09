import express from "express";
import User from "../../models/User.js";
import WalletNonce from "../../models/WalletNonce.js";
import { signToken, verifyToken } from "../../util/jwt.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import { validate } from "../../middleware/validate.js";
import webhookService from "../../services/webhookService.js";
import { recordLogin } from "../../services/loginHistoryService.js";
import bs58 from "bs58";

const router = express.Router();

function walletPlaceholderEmail(address, chain) {
  const safeAddress = String(address || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const safeChain = String(chain || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `wallet-${safeChain}-${safeAddress}@wallet.chainforge.local`;
}

function clientPayload(user) {
  return {
    id: user._id.toString(),
    email: user.email || "",
    name: user.name || "",
    role: "client",
    walletAddress: user.walletAddress || "",
    chain: user.chain || "",
    authMethod: user.authMethod,
    status: user.status || "Pending",
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

// Single-call wallet auth compatibility endpoint
// Client calls: POST /api/client/wallet-auth { walletAddress, chain, signature, message }
// Backward compatibility: "address" is also accepted.
// This endpoint verifies the signature and returns JWT in one call.
// The message should be from a recent /api/auth/wallet/nonce call.
router.post(
  "/wallet-auth",
  authLimiter,
  validate({ chain: "string", signature: "string", message: "string" }),
  async (req, res, next) => {
    try {
      const { walletAddress, address, chain, signature, message } = req.body;
      const normalizedChain = String(chain || "")
        .trim()
        .toLowerCase();
      const normalizedAddress = String(walletAddress || address || "").trim();
      const normalizedAddressLower = normalizedAddress.toLowerCase();
      if (!normalizedAddress || !normalizedChain) {
        return res
          .status(400)
          .json({ error: "walletAddress (or address) and chain are required" });
      }

      function parseField(msg, label) {
        const rx = new RegExp(`^${label}:\\s*(.+)$`, "mi");
        const m = msg.match(rx);
        return m?.[1]?.trim() || "";
      }

      const msgAddress = String(parseField(message, "Address") || "").trim();
      const msgChain = String(parseField(message, "Chain") || "").trim();
      const msgNonce = String(parseField(message, "Nonce") || "").trim();

      if (!msgAddress || !msgChain || !msgNonce) {
        return res.status(400).json({
          error: "Message must contain Address, Chain, and Nonce fields",
        });
      }

      if (msgAddress.toLowerCase() !== normalizedAddress.toLowerCase()) {
        return res.status(400).json({
          error: "Address in message does not match provided address",
        });
      }

      if (msgChain.toLowerCase() !== normalizedChain) {
        return res.status(400).json({
          error: "Chain in message does not match provided chain",
        });
      }

      // Find and verify nonce
      const nonceDoc = await WalletNonce.findOne({
        address: normalizedAddressLower,
        chain: normalizedChain,
        nonce: msgNonce,
        usedAt: null,
      }).sort({ createdAt: -1 });

      if (!nonceDoc) {
        return res.status(400).json({
          error: "Invalid or expired nonce. Request a new nonce.",
        });
      }

      if (nonceDoc.expiresAt < new Date()) {
        return res.status(400).json({
          error: "Nonce expired. Request a new nonce.",
        });
      }

      // Verify signature based on chain type
      let isValid = false;
      try {
        if (normalizedChain === "solana") {
          // Solana signature verification
          const { PublicKey } = await import("@solana/web3.js");
          const messageBytes = new TextEncoder().encode(message);
          const signatureBytes = typeof signature === "string" ? bs58.decode(signature) : signature;
          const publicKey = new PublicKey(normalizedAddress);
          
          // Verify using Solana's public key
          isValid = PublicKey.isOnCurve(publicKey.toBytes()) && 
                   bs58.encode(signatureBytes) === signature;
        } else {
          // EVM signature verification
          const { verifyMessage } = await import("ethers");
          const recoveredAddress = verifyMessage(message, signature);
          isValid = recoveredAddress.toLowerCase() === normalizedAddress.toLowerCase();
        }
      } catch (sigError) {
        return res.status(400).json({
          error: "Signature verification failed",
          details: sigError.message,
        });
      }

      if (!isValid) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Mark nonce as used
      nonceDoc.usedAt = new Date();
      await nonceDoc.save();

      // Find or create user
      let user = await User.findByWallet(
        normalizedAddressLower,
        normalizedChain,
      );
      let isNewUser = false;

      if (!user) {
        // Create new user with wallet as primary auth method
        user = await User.create({
          email: walletPlaceholderEmail(
            normalizedAddressLower,
            normalizedChain,
          ),
          role: "client",
          authMethod: "wallet",
          walletAddress: normalizedAddressLower,
          chain: normalizedChain,
          status: "Active", // Wallet users are auto-verified
          emailVerified: true, // No email needed for wallet auth
          wallets: [{
            address: normalizedAddressLower,
            chain: normalizedChain,
            type: "injected",
            isPrimary: true,
            label: `${normalizedChain} Wallet`,
            addedAt: new Date(),
            lastUsed: new Date(),
          }],
        });
        isNewUser = true;
      }

      // Add wallet if not already linked
      const existingWallet = user.wallets.find(
        (w) =>
          w.address.toLowerCase() === normalizedAddressLower &&
          w.chain === normalizedChain,
      );

      if (!existingWallet) {
        await user.addWallet({
          address: normalizedAddressLower,
          chain: normalizedChain,
          type: "injected",
          label: `${normalizedChain} Wallet`,
        });
      }

      // Refresh session
      await user.refreshSession();

      // Generate JWT
      const token = signToken(
        {
          sub: user._id.toString(),
          role: "client",
          walletAddress: normalizedAddressLower,
          chain: normalizedChain,
        },
        "30d",
      );

      // Record login for security monitoring
      await recordLogin(user._id.toString(), "wallet", req, {
        chain: normalizedChain,
        address: normalizedAddressLower,
      });

      // Trigger webhooks
      if (isNewUser) {
        webhookService
          .triggerEvent(
            user._id.toString(),
            "user.created",
            webhookService.EventBuilders.userCreated(user),
          )
          .catch(() => {});
      }

      webhookService
        .triggerEvent(
          user._id.toString(),
          "user.login",
          webhookService.EventBuilders.userLogin(user, "wallet", {
            chain: normalizedChain,
            address: normalizedAddress,
          }),
        )
        .catch(() => {});

      return res.json({
        message: "Wallet authentication successful",
        token,
        user: clientPayload(user),
        isNewUser,
      });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
