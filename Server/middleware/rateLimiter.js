/**
 * Rate limiter with Redis-backed counters and in-memory fallback.
 */

import { getRedisClient } from "../services/cacheService.js";

const store = new Map(); // key -> { count, resetAt }

function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
}

function buildScopedKey(req, scope) {
  const ip = getClientIp(req);
  const path = `${req.baseUrl || ""}${req.path || ""}`;
  const email = String(req.body?.email || req.query?.email || "")
    .trim()
    .toLowerCase();
  const address = String(req.body?.address || req.query?.address || "")
    .trim()
    .toLowerCase();
  const identifier = email || address || "anon";
  return `${scope}:${ip}:${path}:${identifier}`;
}

function cleanup() {
  const now = Date.now();
  for (const [key, val] of store) {
    if (now > val.resetAt) store.delete(key);
  }
}

// Cleanup every 60 seconds
setInterval(cleanup, 60_000).unref();

/**
 * @param {object} opts
 * @param {number} opts.windowMs   - Time window in ms (default 15 min)
 * @param {number} opts.max        - Max requests per window (default 100)
 * @param {string} [opts.message]  - Error message
 * @param {function} [opts.keyGenerator] - (req) => string
 */
export function rateLimit({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests, please try again later",
  keyGenerator = (req) => getClientIp(req),
} = {}) {
  return async (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const redis = getRedisClient();

    if (redis) {
      try {
        const redisKey = `rate-limit:${key}`;
        
        // Use simple atomic operations - INCR with SETNX for expiration
        const count = await redis.incr(redisKey);
        
        // Set expiration only on first increment (atomic operation)
        if (count === 1) {
          await redis.pexpire(redisKey, windowMs);
        }
        
        const ttl = await redis.pttl(redisKey);
        const resetAt = ttl > 0 ? now + ttl : now + windowMs;

        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));
        res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));

        if (count > max) {
          return res.status(429).json({ error: message });
        }

        return next();
      } catch (error) {
        // Log Redis errors but fall through to memory limiter
        console.error('Rate limiter Redis error:', error.message);
      }
    }

    // Thread-safe memory fallback with atomic operations
    const getOrCreateEntry = () => {
      let entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        store.set(key, entry);
      }
      return entry;
    };

    // Thread-safe memory fallback
    const entry = getOrCreateEntry();
    entry.count++;
    
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }

    return next();
  };
}

/** Strict limiter for auth endpoints (30 attempts per 5 min) */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: "Too many login attempts. Please wait 5 minutes.",
  keyGenerator: (req) => buildScopedKey(req, "auth"),
});

/** Stricter limiter for admin login */
export const adminLoginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: "Too many admin login attempts. Please wait 5 minutes.",
  keyGenerator: (req) => buildScopedKey(req, "admin-auth"),
});

/** Wallet auth limiter isolated from email login/signup limits */
export const walletAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: "Too many wallet auth attempts. Please wait 5 minutes.",
  keyGenerator: (req) => buildScopedKey(req, "wallet-auth"),
});

/** General API limiter (200 req per 15 min) */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});

/** Admin API limiter (5000 req per 15 min) - more lenient for dashboard */
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: "Too many admin requests. Please try again later.",
});

/** Skip rate limiting for health endpoint */
export const createHealthLimiter = () => (req, res, next) => next();
