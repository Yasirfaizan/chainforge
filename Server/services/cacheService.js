/**
 * Cache service with Redis primary and NodeCache fallback.
 */
import Redis from "ioredis";
import NodeCache from "node-cache";
import { logger } from "./logger.js";

const hasRedis = Boolean(process.env.REDIS_URL);
const memoryCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
let redisClient = null;

if (hasRedis) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redisClient.on("error", (err) => {
    logger.warn(
      { err: err.message },
      "Redis unavailable, fallback to memory cache",
    );
  });
}

export const cacheHealth = async () => {
  if (!redisClient) return "down";
  try {
    await redisClient.ping();
    return "up";
  } catch {
    return "down";
  }
};

export async function cacheGet(key) {
  if (redisClient) {
    try {
      const val = await redisClient.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      // ignore and fall through
    }
  }
  return memoryCache.get(key) ?? null;
}

export async function cacheSet(key, value, ttlSeconds) {
  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch {
      // ignore and fall through
    }
  }
  memoryCache.set(key, value, ttlSeconds);
}

export function getRedisClient() {
  return redisClient;
}

export default {
  cacheGet,
  cacheSet,
  cacheHealth,
  getRedisClient,
};
