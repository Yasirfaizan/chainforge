import express from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { CHAIN_REGISTRY } from "../config/chains.js";
import onchainService from "../services/onchainDataService.js";
import webhookService from "../services/webhookService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/wallets
 * Get all wallets for the current user
 */
router.get("/", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select(
      "wallets walletAddress chain preferences",
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Format response
    const wallets = user.wallets.map((w) => ({
      id: w._id.toString(),
      address: w.address,
      chain: w.chain,
      type: w.type,
      label: w.label,
      isPrimary: w.isPrimary,
      addedAt: w.addedAt,
      lastUsed: w.lastUsed,
      // Short address for display
      shortAddress: `${w.address.slice(0, 6)}...${w.address.slice(-4)}`,
    }));

    res.json({
      wallets,
      primaryWalletId: wallets.find((w) => w.isPrimary)?.id || null,
      preferences: user.preferences,
      // Backwards compatibility
      legacyWallet: user.walletAddress
        ? {
            address: user.walletAddress,
            chain: user.chain,
          }
        : null,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/wallets/link
 * Link a new wallet to the current user account
 */
router.post(
  "/link",
  validate({ address: "string", chain: "string" }),
  async (req, res, next) => {
    try {
      const { address, chain, label } = req.body;
      const userId = req.user.sub;
      const normalizedChain = String(chain || "")
        .trim()
        .toLowerCase();
      const rawType = String(req.body.type || "injected")
        .trim()
        .toLowerCase();
      const type =
        rawType === "solana" || rawType === "evm" ? "injected" : rawType;

      // Validate address format
      if (normalizedChain !== "solana" && !address.startsWith("0x")) {
        return res.status(400).json({ error: "Invalid EVM address format" });
      }
      if (normalizedChain === "solana" && address.length < 32) {
        return res.status(400).json({ error: "Invalid Solana address" });
      }

      // Check if wallet is already linked to another user
      const existingUser = await User.findOne({
        $or: [
          { walletAddress: address, chain: normalizedChain },
          { "wallets.address": address, "wallets.chain": normalizedChain },
        ],
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(409).json({
          error: "This wallet is already linked to another account",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await user.addWallet({ address, chain: normalizedChain, type, label });

      webhookService
        .triggerEvent(
          userId,
          "wallet.linked",
          webhookService.EventBuilders.walletLinked(
            { address, chain: normalizedChain, type, label: label || "" },
            user,
          ),
          { chain: normalizedChain, walletAddress: address },
        )
        .catch(() => {});

      // Trigger user.updated webhook
      webhookService
        .triggerEvent(
          userId,
          "user.updated",
          webhookService.EventBuilders.userUpdated(user, {
            action: "wallet_linked",
            walletAddress: address,
            chain: normalizedChain,
          }),
        )
        .catch(() => {});

      const walletNumber = user.wallets.length;
      res.status(201).json({
        message: "Wallet linked successfully",
        wallet: {
          id: user.wallets[user.wallets.length - 1]._id.toString(),
          address,
          chain: normalizedChain,
          type,
          label: label,
          number: walletNumber,
        },
      });
    } catch (e) {
      if (e.message === "Wallet already linked to this account") {
        return res.status(409).json({ error: e.message });
      }
      next(e);
    }
  },
);

/**
 * DELETE /api/wallets/:id
 * Unlink a wallet from the current user
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const wallet = user.wallets.id(req.params.id);
    await user.removeWallet(req.params.id);

    if (wallet) {
      webhookService
        .triggerEvent(
          req.user.sub,
          "wallet.unlinked",
          {
            type: "wallet.unlinked",
            wallet: { address: wallet.address, chain: wallet.chain },
          },
          { chain: wallet.chain, walletAddress: wallet.address },
        )
        .catch(() => {});

      // Trigger user.updated webhook
      webhookService
        .triggerEvent(
          req.user.sub,
          "user.updated",
          webhookService.EventBuilders.userUpdated(user, {
            action: "wallet_unlinked",
            walletAddress: wallet.address,
            chain: wallet.chain,
          }),
        )
        .catch(() => {});
    }

    res.json({ message: "Wallet unlinked successfully" });
  } catch (e) {
    if (e.message === "Wallet not found") {
      return res.status(404).json({ error: e.message });
    }
    if (e.message.includes("primary wallet")) {
      return res.status(400).json({ error: e.message });
    }
    next(e);
  }
});

/**
 * PATCH /api/wallets/:id/primary
 * Set a wallet as the primary wallet
 */
router.patch("/:id/primary", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.setPrimaryWallet(req.params.id);

    res.json({
      message: "Primary wallet updated",
      primaryWallet: user.primaryWallet,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/wallets/:id/label
 * Update wallet label
 */
router.patch(
  "/:id/label",
  validate({ label: "string" }),
  async (req, res, next) => {
    try {
      const { label } = req.body;
      const user = await User.findById(req.user.sub);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const wallet = user.wallets.id(req.params.id);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      wallet.label = label;
      await user.save();

      res.json({
        message: "Wallet label updated",
        wallet: {
          id: wallet._id.toString(),
          label: wallet.label,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * GET /api/wallets/:address/balance
 * Get wallet balance (proxy to blockchain)
 */
router.get("/:address/balance", async (req, res, next) => {
  try {
    const { address } = req.params;
    const { chain = "ethereum" } = req.query;

    // Verify user owns this wallet
    const user = await User.findById(req.user.sub);
    const ownsWallet = user.wallets.some(
      (w) => w.address.toLowerCase() === address.toLowerCase(),
    );

    if (!ownsWallet) {
      return res
        .status(403)
        .json({ error: "Wallet not linked to this account" });
    }

    const balance = await onchainService.getBalance(address, chain);
    res.json(balance);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/wallets/supported
 * Get list of supported chains and wallet types
 */
router.get("/supported/list", (_req, res) => {
  res.json({
    chains: Object.values(CHAIN_REGISTRY).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      symbol: c.symbol,
    })),
    walletTypes: [
      {
        id: "metamask",
        name: "MetaMask",
        chains: [
          "ethereum",
          "polygon",
          "bnb",
          "avalanche",
          "arbitrum",
          "optimism",
          "base",
          "zksync",
          "linea",
        ],
        type: "evm",
      },
      {
        id: "phantom",
        name: "Phantom",
        chains: ["solana", "ethereum", "polygon", "sui"],
        type: "both",
      },
      {
        id: "brave",
        name: "Brave Wallet",
        chains: ["ethereum", "polygon", "solana", "bitcoin"],
        type: "both",
      },
      {
        id: "coinbase",
        name: "Coinbase Wallet",
        chains: ["ethereum", "polygon", "bnb", "base", "solana"],
        type: "both",
      },
      {
        id: "trust",
        name: "Trust Wallet",
        chains: ["ethereum", "polygon", "bnb", "solana", "bitcoin"],
        type: "both",
      },
    ],
  });
});

export default router;
