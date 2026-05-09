/**
 * ChainForge Webhook Service
 * Deliver real-time blockchain events to your backend
 * Like Stripe webhooks, but for Web3
 */

import crypto from "crypto";
import Webhook from "../models/Webhook.js";
import { getRedisClient } from "./cacheService.js";

/**
 * Generate webhook signature for verification
 */
export function generateSignature(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

/**
 * Verify webhook signature
 */
export function verifySignature(payload, signature, secret) {
  const expected = generateSignature(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

const redis = getRedisClient();
const WEBHOOK_JOB_HASH = "chainforge:webhook:jobs";
const WEBHOOK_DUE_ZSET = "chainforge:webhook:due";
let workerStarted = false;

async function enqueueWebhookJob(job, delayMs = 0) {
  if (!redis) return false;
  const id = job.id || crypto.randomUUID();
  const record = {
    ...job,
    id,
    nextRunAt: Date.now() + delayMs,
  };
  await redis.hset(WEBHOOK_JOB_HASH, id, JSON.stringify(record));
  await redis.zadd(WEBHOOK_DUE_ZSET, record.nextRunAt, id);
  return true;
}

async function removeWebhookJob(jobId) {
  if (!redis) return;
  await redis.hdel(WEBHOOK_JOB_HASH, jobId);
  await redis.zrem(WEBHOOK_DUE_ZSET, jobId);
}

async function attemptDelivery(
  webhook,
  event,
  payload,
  deliveryId = crypto.randomUUID(),
  retryCount = 0,
) {
  const timestamp = Date.now();
  const deliveryPayload = {
    id: deliveryId,
    event,
    timestamp: new Date(timestamp).toISOString(),
    data: payload,
  };
  const signature = generateSignature(deliveryPayload, webhook.secret);

  const response = await fetch(webhook.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ChainForge-Signature": signature,
      "X-ChainForge-Event": event,
      "X-ChainForge-Delivery": deliveryId,
      "X-ChainForge-Timestamp": timestamp.toString(),
      ...(retryCount > 0
        ? { "X-ChainForge-Retry": retryCount.toString() }
        : {}),
      "User-Agent": "ChainForge-Webhook/1.0",
    },
    body: JSON.stringify(deliveryPayload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return { deliveryId, deliveryPayload, signature };
}

async function processQueuedJobs() {
  if (!redis) return;
  const now = Date.now();
  const jobIds = await redis.zrangebyscore(
    WEBHOOK_DUE_ZSET,
    "-inf",
    now,
    "LIMIT",
    0,
    25,
  );
  for (const jobId of jobIds) {
    const raw = await redis.hget(WEBHOOK_JOB_HASH, jobId);
    if (!raw) {
      await removeWebhookJob(jobId);
      continue;
    }

    const job = JSON.parse(raw);
    const webhook = await Webhook.findById(job.webhookId);
    if (!webhook || webhook.status !== "active") {
      await removeWebhookJob(jobId);
      continue;
    }

    try {
      await attemptDelivery(
        webhook,
        job.event,
        job.payload,
        job.deliveryId,
        job.attempt || 0,
      );
      await webhook.recordDelivery(true);
      await removeWebhookJob(jobId);
    } catch (error) {
      const attempt = (job.attempt || 0) + 1;
      await webhook.recordDelivery(false, error.message);
      if (attempt < (webhook.retryConfig?.maxRetries || 3)) {
        const retryDelay =
          (webhook.retryConfig?.retryDelay || 5000) *
          Math.pow(webhook.retryConfig?.backoffMultiplier || 2, attempt - 1);
        await enqueueWebhookJob(
          { ...job, attempt, lastError: error.message },
          retryDelay,
        );
      } else {
        await removeWebhookJob(jobId);
      }
    }
  }
}

function startWebhookWorker() {
  if (workerStarted || !redis) return;
  workerStarted = true;
  processQueuedJobs().catch(() => {});
  setInterval(() => {
    processQueuedJobs().catch(() => {});
  }, 5000).unref();
}

startWebhookWorker();

/**
 * Webhook delivery service
 */
class WebhookDeliverer {
  constructor() {
    this.retryQueue = new Map();
  }

  /**
   * Send webhook event
   */
  async deliver(webhook, event, payload) {
    try {
      const { deliveryId } = await attemptDelivery(webhook, event, payload);
      await webhook.recordDelivery(true);
      return { success: true, deliveryId };
    } catch (error) {
      await webhook.recordDelivery(false, error.message);
      if (redis) {
        await enqueueWebhookJob(
          {
            webhookId: webhook._id.toString(),
            event,
            payload,
            attempt: 0,
          },
          webhook.retryConfig?.retryDelay || 5000,
        );
      } else {
        const retryPayload = {
          id: crypto.randomUUID(),
          event,
          timestamp: new Date().toISOString(),
          data: payload,
        };
        this._queueRetry(
          webhook,
          retryPayload,
          generateSignature(retryPayload, webhook.secret),
          0,
        );
      }

      return {
        success: false,
        deliveryId: null,
        error: error.message,
        willRetry: true,
      };
    }
  }

  /**
   * Queue webhook for retry with exponential backoff
   */
  _queueRetry(webhook, payload, signature, attempt) {
    const delay =
      webhook.retryConfig.retryDelay *
      Math.pow(webhook.retryConfig.backoffMultiplier, attempt);

    setTimeout(async () => {
      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ChainForge-Signature": signature,
            "X-ChainForge-Event": payload.event,
            "X-ChainForge-Delivery": payload.id,
            "X-ChainForge-Retry": (attempt + 1).toString(),
            "User-Agent": "ChainForge-Webhook/1.0",
          },
          body: JSON.stringify(payload),
          timeout: 30000,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await webhook.recordDelivery(true);
      } catch (error) {
        if (attempt < webhook.retryConfig.maxRetries - 1) {
          this._queueRetry(webhook, payload, signature, attempt + 1);
        }
      }
    }, delay);
  }
}

// Global deliverer instance
const deliverer = new WebhookDeliverer();

/**
 * Trigger webhook event for user
 */
export async function triggerEvent(userId, event, payload, filters = {}) {
  try {
    // Find all active webhooks for this user that want this event
    const webhooks = await Webhook.find({
      userId,
      status: "active",
      events: event,
    });

    const results = [];

    for (const webhook of webhooks) {
      // Check filters
      if (
        filters.chain &&
        webhook.chains.length > 0 &&
        !webhook.chains.includes(filters.chain)
      ) {
        continue;
      }

      if (
        filters.walletAddress &&
        webhook.walletAddresses.length > 0 &&
        !webhook.walletAddresses.includes(filters.walletAddress)
      ) {
        continue;
      }

      if (redis) {
        await enqueueWebhookJob(
          {
            webhookId: webhook._id.toString(),
            event,
            payload,
            attempt: 0,
          },
          0,
        );
        results.push({ webhookId: webhook._id, queued: true });
      } else {
        const result = await deliverer.deliver(webhook, event, payload);
        results.push({ webhookId: webhook._id, ...result });
      }
    }

    return { delivered: results.length, results };
  } catch (error) {
    console.error("Error triggering webhooks:", error);
    return { delivered: 0, error: error.message };
  }
}

/**
 * Event types and payload builders
 */
export const EventBuilders = {
  /**
   * Build transaction event payload
   */
  transaction(tx, type) {
    return {
      type: `transaction.${type}`,
      transaction: {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.amount,
        chain: tx.chain,
        status: tx.status,
        blockNumber: tx.blockNumber,
        timestamp: tx.createdAt,
      },
    };
  },

  /**
   * Build balance change event
   */
  balanceChange(address, chain, oldBalance, newBalance, token = "native") {
    return {
      type: "balance.change",
      wallet: { address, chain },
      token,
      oldBalance,
      newBalance,
      change: newBalance - oldBalance,
    };
  },

  /**
   * Build wallet linked event
   */
  walletLinked(wallet, user) {
    return {
      type: "wallet.linked",
      wallet: {
        address: wallet.address,
        chain: wallet.chain,
        type: wallet.type,
        label: wallet.label,
      },
      user: {
        id: user._id,
        email: user.email,
      },
    };
  },

  /**
   * Build API key event
   */
  apiKey(key, type, user) {
    return {
      type: `api.key.${type}`,
      apiKey: {
        id: key._id,
        label: key.label,
        mask: key.mask,
        scopes: key.scopes,
      },
      user: { id: user._id, email: user.email },
    };
  },

  /**
   * Build user created event
   */
  userCreated(user) {
    return {
      type: "user.created",
      user: {
        id: user._id.toString(),
        email: user.email || "",
        name: user.name || "",
        authMethod: user.authMethod,
        walletAddress: user.walletAddress || "",
        chain: user.chain || "",
        createdAt: user.createdAt,
      },
    };
  },

  /**
   * Build user login event
   */
  userLogin(user, authMethod, metadata = {}) {
    return {
      type: "user.login",
      user: {
        id: user._id.toString(),
        email: user.email || "",
        name: user.name || "",
        authMethod,
      },
      ...metadata,
    };
  },

  /**
   * Build user updated event
   */
  userUpdated(user, changes = {}) {
    return {
      type: "user.updated",
      user: {
        id: user._id.toString(),
        email: user.email || "",
        name: user.name || "",
        authMethod: user.authMethod,
      },
      changes,
    };
  },
};

/**
 * Test webhook URL
 */
export async function testWebhook(url) {
  try {
    const testPayload = {
      id: "test-" + crypto.randomUUID(),
      event: "webhook.test",
      timestamp: new Date().toISOString(),
      data: { message: "This is a test event from ChainForge" },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ChainForge-Event": "webhook.test",
        "User-Agent": "ChainForge-Webhook/1.0",
      },
      body: JSON.stringify(testPayload),
      timeout: 10000,
    });

    return {
      success: response.ok,
      status: response.status,
      latency: Date.now(), // Would track actual latency
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  triggerEvent,
  generateSignature,
  verifySignature,
  testWebhook,
  EventBuilders,
};
