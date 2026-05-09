import express from "express";
import ApiKey from "../models/ApiKey.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import crypto from "crypto";
import webhookService from "../services/webhookService.js";

const router = express.Router();

router.use(requireAuth);

const ALLOWED_SCOPES = [
  "read:balance",
  "read:history",
  "write:tx",
  "admin:users",
  "webhooks:manage",
];

/** List all API keys for the authenticated user */
router.get("/", async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.sub })
      .sort({ createdAt: -1 })
      .select("-keyHash"); // Never send raw or hashed key in listings
    return res.json(
      keys.map((k) => ({
        id: k._id.toString(),
        mask: k.mask,
        label: k.label,
        scopes: k.scopes,
        status: k.revokedAt ? "Revoked" : "Active",
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      }))
    );
  } catch (e) {
    next(e);
  }
});

/** Generate a new API key */
router.post("/generate", async (req, res, next) => {
  try {
    const {
      label = "",
      scopes = ["read:balance"],
      environment = process.env.NODE_ENV === "production" ? "live" : "test",
      rateLimitRpm = 60,
      expiresAt = null,
      walletId = null,
    } = req.body;
    // Check if user has any linked wallets
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.user.sub);
    const userWallets = user?.wallets || [];
    
    if (userWallets.length === 0) {
      return res.status(400).json({ 
        error: "No wallets linked. Please link a wallet first to create API keys." 
      });
    }

    // If walletId specified, validate it belongs to user
    if (walletId) {
      const targetWallet = userWallets.find(w => w._id.toString() === walletId);
      if (!targetWallet) {
        return res.status(400).json({ 
          error: "Invalid wallet ID. Please select a wallet you have linked." 
        });
      }
    }

    const normalizedScopes = Array.isArray(scopes)
      ? scopes.filter((s) => ALLOWED_SCOPES.includes(s))
      : ["read:balance"];
    const result = await ApiKey.generate(
      req.user.sub,
      label,
      normalizedScopes.length ? normalizedScopes : ["read:balance"],
      environment === "test" ? "test" : "live",
      Number(rateLimitRpm) || 60,
      expiresAt,
      walletId, // Associate API key with specific wallet
    );
    return res.status(201).json({
      id: result._id.toString(),
      rawKey: result.rawKey, // Only shown once
      mask: result.mask,
      label: result.label,
      scopes: result.scopes,
      rateLimitRpm: result.rateLimitRpm,
      expiresAt: result.expiresAt || null,
      message: "Save this key — it won't be shown again.",
    });
  } catch (e) {
    next(e);
  }
});

/** Rotate an API key (invalidate old, issue new) */
router.post("/:id/rotate", async (req, res, next) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!key) return res.status(404).json({ error: "Key not found" });
    if (key.revokedAt) return res.status(400).json({ error: "Key is revoked" });

    // Preserve env/scopes/limits/expiry; issue a brand new raw key and overwrite hash+mask.
    const rotated = await ApiKey.generate(
      req.user.sub,
      key.label,
      key.scopes,
      key.environment,
      key.rateLimitRpm,
      key.expiresAt,
    );

    // Replace this key doc in-place so references (apiKeyId) remain stable.
    key.keyHash = rotated.keyHash;
    key.hashAlg = rotated.hashAlg || key.hashAlg;
    key.mask = rotated.mask;
    key.rotatedAt = new Date();
    key.lastUsedAt = null;
    key.usageCount = 0;
    await key.save();

    // Fire webhooks (best-effort)
    webhookService.triggerEvent(
      req.user.sub,
      "api.key.created",
      webhookService.EventBuilders.apiKey(key, "created", { _id: req.user.sub, email: "" }),
    ).catch(() => {});

    return res.status(201).json({
      id: key._id.toString(),
      rawKey: rotated.rawKey,
      mask: key.mask,
      rotatedAt: key.rotatedAt,
      message: "Save this new key — it won't be shown again.",
    });
  } catch (e) {
    // Unique keyHash collision is extremely unlikely; retry once if it happens.
    if (String(e?.code) === "11000") {
      try {
        const key = await ApiKey.findOne({ _id: req.params.id, userId: req.user.sub });
        if (!key) return res.status(404).json({ error: "Key not found" });
        const rotated = await ApiKey.generate(
          req.user.sub,
          key.label,
          key.scopes,
          key.environment,
          key.rateLimitRpm,
          key.expiresAt,
        );
        key.keyHash = rotated.keyHash;
        key.hashAlg = rotated.hashAlg || key.hashAlg;
        key.mask = rotated.mask;
        key.rotatedAt = new Date();
        key.lastUsedAt = null;
        key.usageCount = 0;
        await key.save();
        return res.status(201).json({
          id: key._id.toString(),
          rawKey: rotated.rawKey,
          mask: key.mask,
          rotatedAt: key.rotatedAt,
          message: "Save this new key — it won't be shown again.",
        });
      } catch (e2) {
        return next(e2);
      }
    }
    next(e);
  }
});

/** Revoke (Drop) an API key */
router.patch("/:id/revoke", async (req, res, next) => {
  try {
    const key = await ApiKey.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    });
    if (!key) return res.status(404).json({ error: "Key not found" });

    // Trigger webhook before deletion
    webhookService.triggerEvent(
      req.user.sub,
      "api.key.revoked",
      webhookService.EventBuilders.apiKey(key, "revoked", { _id: req.user.sub, email: "" }),
    ).catch(() => {});

    // Permanently drop the key
    await ApiKey.deleteOne({ _id: key._id });

    return res.json({ message: "Key dropped permanently", id: key._id.toString() });
  } catch (e) {
    next(e);
  }
});

/** Delete an API key permanently */
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await ApiKey.deleteOne({
      _id: req.params.id,
      userId: req.user.sub,
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Key not found" });
    }
    return res.json({ message: "Key deleted" });
  } catch (e) {
    next(e);
  }
});

export default router;
