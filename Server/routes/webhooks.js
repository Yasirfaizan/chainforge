import express from "express";
import crypto from "crypto";
import Webhook from "../models/Webhook.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import webhookService from "../services/webhookService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/webhooks
 * List all webhooks for the user
 */
router.get("/", async (req, res, next) => {
  try {
    const webhooks = await Webhook.find({ userId: req.user.sub })
      .select("-secret") // Never return secrets
      .sort({ createdAt: -1 });

    res.json({
      webhooks: webhooks.map(w => ({
        id: w._id.toString(),
        url: w.url,
        label: w.label,
        events: w.events,
        chains: w.chains,
        walletAddresses: w.walletAddresses,
        status: w.status,
        stats: w.stats,
        createdAt: w.createdAt
      }))
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post(
  "/",
  validate({ url: "string", events: "array" }),
  async (req, res, next) => {
    try {
      const { url, label, events, chains, walletAddresses } = req.body;

      // Validate URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }

      // Validate events
      const validEvents = [
        "transaction.incoming",
        "transaction.outgoing", 
        "transaction.confirmed",
        "transaction.failed",
        "balance.change",
        "wallet.linked",
        "wallet.unlinked",
        "api.key.created",
        "api.key.revoked",
        "user.login",
        "user.updated"
      ];

      const invalidEvents = events.filter(e => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({ 
          error: `Invalid events: ${invalidEvents.join(", ")}` 
        });
      }

      // Generate secret for signature verification
      const secret = crypto.randomBytes(32).toString("hex");

      const webhook = await Webhook.create({
        userId: req.user.sub,
        url,
        label: label || "",
        events,
        chains: chains || [],
        walletAddresses: walletAddresses || [],
        secret,
        status: "active"
      });

      res.status(201).json({
        message: "Webhook created",
        webhook: {
          id: webhook._id.toString(),
          url: webhook.url,
          label: webhook.label,
          events: webhook.events,
          status: webhook.status,
          secret: secret // Only shown once on creation
        }
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * PATCH /api/webhooks/:id
 * Update webhook
 */
router.patch(
  "/:id",
  async (req, res, next) => {
    try {
      const { label, events, chains, walletAddresses, status } = req.body;

      const webhook = await Webhook.findOne({
        _id: req.params.id,
        userId: req.user.sub
      });

      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      if (label !== undefined) webhook.label = label;
      if (events) webhook.events = events;
      if (chains) webhook.chains = chains;
      if (walletAddresses) webhook.walletAddresses = walletAddresses;
      if (status && ["active", "paused", "disabled"].includes(status)) {
        webhook.status = status;
      }

      await webhook.save();

      res.json({
        message: "Webhook updated",
        webhook: {
          id: webhook._id.toString(),
          url: webhook.url,
          label: webhook.label,
          events: webhook.events,
          chains: webhook.chains,
          walletAddresses: webhook.walletAddresses,
          status: webhook.status
        }
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const webhook = await Webhook.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.sub
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json({ message: "Webhook deleted" });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/webhooks/:id/test
 * Test webhook delivery
 */
router.post("/:id/test", async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      userId: req.user.sub
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const result = await webhookService.testWebhook(webhook.url);

    res.json({
      message: result.success ? "Test delivered successfully" : "Test failed",
      result
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/webhooks/:id/rotate-secret
 * Rotate webhook secret
 */
router.post("/:id/rotate-secret", async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      userId: req.user.sub
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const newSecret = crypto.randomBytes(32).toString("hex");
    webhook.secret = newSecret;
    await webhook.save();

    res.json({
      message: "Secret rotated",
      secret: newSecret // Only shown once
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/webhooks/events
 * List available event types
 */
router.get("/events/list", (_req, res) => {
  res.json({
    events: [
      {
        id: "transaction.incoming",
        name: "Incoming Transaction",
        description: "Fired when you receive a transaction",
        example: { hash: "0x...", from: "0x...", value: "1.5" }
      },
      {
        id: "transaction.outgoing", 
        name: "Outgoing Transaction",
        description: "Fired when you send a transaction",
        example: { hash: "0x...", to: "0x...", value: "0.5" }
      },
      {
        id: "transaction.confirmed",
        name: "Transaction Confirmed", 
        description: "Fired when a transaction is confirmed on-chain",
        example: { hash: "0x...", blockNumber: 12345678 }
      },
      {
        id: "transaction.failed",
        name: "Transaction Failed",
        description: "Fired when a transaction fails",
        example: { hash: "0x...", error: "insufficient funds" }
      },
      {
        id: "balance.change",
        name: "Balance Change",
        description: "Fired when your wallet balance changes",
        example: { address: "0x...", oldBalance: "1.0", newBalance: "2.0" }
      },
      {
        id: "wallet.linked",
        name: "Wallet Linked",
        description: "Fired when a new wallet is linked to your account"
      },
      {
        id: "wallet.unlinked",
        name: "Wallet Unlinked", 
        description: "Fired when a wallet is removed from your account"
      },
      {
        id: "api.key.created",
        name: "API Key Created",
        description: "Fired when a new API key is generated"
      },
      {
        id: "api.key.revoked",
        name: "API Key Revoked",
        description: "Fired when an API key is revoked"
      }
    ]
  });
});

/**
 * POST /api/webhooks/verify
 * Verify webhook signature (for testing)
 */
router.post(
  "/verify",
  validate({ payload: "object", signature: "string", secret: "string" }),
  (req, res) => {
    try {
      const { payload, signature, secret } = req.body;
      
      const isValid = webhookService.verifySignature(payload, signature, secret);
      
      res.json({
        valid: isValid,
        message: isValid ? "Signature is valid" : "Signature is invalid"
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

export default router;
