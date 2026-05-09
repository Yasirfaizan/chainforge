/**
 * API key authentication middleware for external SDK calls.
 */
import crypto from "crypto";
import ApiKey from "../models/ApiKey.js";
import ApiUsageLog from "../models/ApiUsageLog.js";

const windowStore = new Map(); // keyId -> { count, resetAt }

function hashKey(raw) {
  const pepper = process.env.API_KEY_PEPPER;
  if (pepper) {
    return crypto.createHmac("sha256", pepper).update(raw).digest("hex");
  }
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function extractApiKey(req) {
  const header = req.header("X-API-Key") || "";
  if (header) return header.trim();
  const auth = req.header("Authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token.startsWith("cf_live_") || token.startsWith("cf_test_")) return token;
  }
  return "";
}

export async function apiKeyAuth(req, res, next) {
  const rawKey = extractApiKey(req);
  if (!rawKey) return res.status(401).json({ error: "Missing API key" });

  const keyHash = hashKey(rawKey);
  let keyDoc = await ApiKey.findOne({ keyHash });

  // Backward compatibility for keys created before API_KEY_PEPPER existed.
  if (!keyDoc && process.env.API_KEY_PEPPER) {
    const legacyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    keyDoc = await ApiKey.findOne({ keyHash: legacyHash });
  }

  if (!keyDoc || !keyDoc.isActive()) return res.status(401).json({ error: "Invalid API key" });

  // Per-key rolling limiter (in-memory). For multi-instance prod, swap to Redis.
  const now = Date.now();
  const bucket = windowStore.get(keyDoc._id.toString());
  if (!bucket || now > bucket.resetAt) {
    windowStore.set(keyDoc._id.toString(), { count: 1, resetAt: now + 60_000 });
  } else {
    bucket.count += 1;
  }
  const current = windowStore.get(keyDoc._id.toString());
  if (current.count > (keyDoc.rateLimitRpm || 60)) {
    return res.status(429).json({ error: "API key rate limit exceeded" });
  }
  res.setHeader("X-RateLimit-Limit", keyDoc.rateLimitRpm || 60);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, (keyDoc.rateLimitRpm || 60) - current.count));
  res.setHeader("X-RateLimit-Reset", Math.ceil(current.resetAt / 1000));

  req.apiKey = keyDoc;
  req.user = { sub: keyDoc.userId.toString(), role: "client" };
  const start = Date.now();
  res.on("finish", async () => {
    try {
      await ApiKey.updateOne(
        { _id: keyDoc._id },
        { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
      );
      await ApiUsageLog.create({
        apiKeyId: keyDoc._id,
        userId: keyDoc.userId,
        route: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        latencyMs: Date.now() - start,
      });
    } catch {
      // non-blocking usage logging
    }
  });

  next();
}

export function requireApiKeyScopes(scopes = []) {
  const required = Array.isArray(scopes) ? scopes : [scopes];
  return (req, res, next) => {
    const keyDoc = req.apiKey;
    if (!keyDoc) return res.status(401).json({ error: "Missing API key" });
    const allowed = new Set(keyDoc.scopes || []);
    const missing = required.filter((s) => !allowed.has(s));
    if (missing.length) {
      return res.status(403).json({ error: `Missing scopes: ${missing.join(", ")}` });
    }
    next();
  };
}

