import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Resolver } from "node:dns/promises";
import session from "express-session";
import passport from "passport";
import clientAuthRoutes from "./routes/clientAuth.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import googleAuthRoutes from "./routes/googleAuth.js";
import githubAuthRoutes from "./routes/githubAuth.js";
import adminMgmtRoutes from "./routes/adminMgmt.js";
import apiKeyRoutes from "./routes/apiKeys.js";
import dataRoutes from "./routes/data.js";
import walletRoutes from "./routes/wallets.js";
import onchainRoutes from "./routes/onchain.js";
import publicApiRoutes from "./routes/publicApi.js";
import webhookRoutes from "./routes/webhooks.js";
import walletAuthRoutes from "./routes/walletAuth.js";
import { CHAIN_REGISTRY } from "./config/chains.js";
import { withEvmProvider } from "./services/rpcProviderManager.js";
import { cacheHealth } from "./services/cacheService.js";
import { startUsageAggregationJob } from "./services/usageAggregator.js";
import { adminGuard } from "./middleware/adminGuard.js";
import { logger } from "./services/logger.js";
import { seedAdminCodes } from "./seed/seedAdminCodes.js";
import { seedDefaultAdmin, seedDefaultClient } from "./seed/seedUsers.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import User from "./models/User.js";
import ApiUsageLog from "./models/ApiUsageLog.js";

const PUBLIC_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];

function normalizeOrigin(origin = "") {
  return String(origin).trim().replace(/\/$/, "");
}

function buildAllowedOrigins() {
  const raw = process.env.CLIENT_ORIGIN;
  const origins = raw
    ? raw.split(",").map((value) => normalizeOrigin(value))
    : [];

  // Always allow common local development origins
  origins.push("http://localhost:5173");
  origins.push("http://localhost:3000");
  origins.push("http://localhost:5001");

  return [...new Set(origins.filter(Boolean))];
}

const allowedOrigins = buildAllowedOrigins();

function toMongoStandardUriFromSrv(uri, hosts, txtParams) {
  const url = new URL(uri);
  const username = url.username
    ? encodeURIComponent(decodeURIComponent(url.username))
    : "";
  const password = url.password
    ? encodeURIComponent(decodeURIComponent(url.password))
    : "";
  const auth = username ? `${username}:${password}@` : "";
  const dbName = url.pathname && url.pathname !== "/" ? url.pathname : "/";

  const mergedParams = new URLSearchParams(txtParams);
  url.searchParams.forEach((value, key) => mergedParams.set(key, value));
  if (!mergedParams.has("tls") && !mergedParams.has("ssl")) {
    mergedParams.set("tls", "true");
  }

  return `mongodb://${auth}${hosts}${dbName}?${mergedParams.toString()}`;
}

async function buildMongoDnsFallbackUri(uri) {
  const url = new URL(uri);
  if (url.protocol !== "mongodb+srv:") {
    throw new Error("Fallback only supports mongodb+srv URIs");
  }

  const resolver = new Resolver();
  resolver.setServers(PUBLIC_DNS_SERVERS);

  const domain = url.hostname;
  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${domain}`);
  if (!srvRecords?.length) {
    throw new Error("No SRV records returned for MongoDB Atlas host");
  }

  const hosts = srvRecords
    .map((record) => `${record.name}:${record.port}`)
    .join(",");

  let txtParams = new URLSearchParams();
  try {
    const txtRecords = await resolver.resolveTxt(domain);
    const txtJoined = txtRecords.map((chunks) => chunks.join("")).join("&");
    if (txtJoined) {
      txtParams = new URLSearchParams(txtJoined);
    }
  } catch {
    // Atlas TXT records are optional for fallback; continue with URI query params only.
  }

  return toMongoStandardUriFromSrv(uri, hosts, txtParams);
}

const app = express();
const PORT = process.env.PORT || 5001;
const startTime = Date.now();
const ADMIN_ROUTE_SLUG =
  process.env.ADMIN_ROUTE_SLUG || "admin-dev-only-slug-change-me";
app.set("trust proxy", 1);

/* ——— Global middleware ——— */
app.use(
  cors({
    origin(origin, callback) {
      if (!allowedOrigins || allowedOrigins.length === 0 || !origin) {
        return callback(null, true);
      }
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(apiLimiter);
app.use(requestLogger);
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

async function checkChainHealth(chain) {
  const timeoutMs = 2000;
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve("__timeout__"), timeoutMs),
  );
  try {
    if (CHAIN_REGISTRY[chain].type === "evm") {
      const res = await Promise.race([
        withEvmProvider(chain, (provider) => provider.getBlockNumber()),
        timeout,
      ]);
      return res === "__timeout__" ? "down" : "up";
    }
    if (chain === "solana") {
      const r = await Promise.race([
        fetch(process.env.RPC_SOLANA || "https://api.mainnet-beta.solana.com", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
        }),
        timeout,
      ]);
      return r === "__timeout__" ? "down" : r.ok ? "up" : "down";
    }
    if (chain === "bitcoin") {
      const r = await Promise.race([
        fetch(
          `${process.env.BITCOIN_API_BASE || "https://mempool.space/api"}/blocks/tip/height`,
        ),
        timeout,
      ]);
      return r === "__timeout__" ? "down" : r.ok ? "up" : "down";
    }
    if (chain === "sui") {
      const r = await Promise.race([
        fetch(process.env.RPC_SUI || "https://fullnode.mainnet.sui.io:443", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "sui_getLatestCheckpointSequenceNumber",
            params: [],
          }),
        }),
        timeout,
      ]);
      return r === "__timeout__" ? "down" : r.ok ? "up" : "down";
    }
    if (chain === "cosmos") {
      const r = await Promise.race([
        fetch(process.env.RPC_COSMOS || "https://cosmos-rest.publicnode.com", {
          method: "GET",
        }),
        timeout,
      ]);
      return r === "__timeout__" ? "down" : r.ok ? "up" : "down";
    }
    if (chain === "near") {
      const r = await Promise.race([
        fetch(process.env.RPC_NEAR || "https://rpc.mainnet.near.org", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "block",
            params: {
              finality: "final",
            },
          }),
        }),
        timeout,
      ]);
      return r === "__timeout__" ? "down" : r.ok ? "up" : "down";
    }
    if (chain === "ton") {
      const r = await Promise.race([
        fetch(process.env.RPC_TON || "https://toncenter.com/api/v2/getMasterchainInfo", {
          method: "GET",
        }),
        timeout,
      ]);
      return r === "__timeout__" ? "down" : r.ok ? "up" : "down";
    }
    if (chain === "tron") {
      const r = await Promise.race([
        fetch(process.env.RPC_TRON || "https://api.trongrid.io/wallet/getnowblock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        }),
        timeout,
      ]);
      return r === "__timeout__" ? "down" : r.ok ? "up" : "down";
    }
    if (chain === "starknet") {
      const r = await Promise.race([
        fetch(process.env.RPC_STARKNET || "https://starknet.publicnode.com", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "starknet_blockNumber",
            params: [],
          }),
        }),
        timeout,
      ]);
      return r === "__timeout__" ? "down" : r.ok ? "up" : "down";
    }
    if (chain === "aptos") {
      const r = await Promise.race([
        fetch(process.env.RPC_APTOS || "https://fullnode.mainnet.aptoslabs.com/v1", {
          method: "GET",
        }),
        timeout,
      ]);
      return r === "__timeout__" ? "down" : r.ok ? "up" : "down";
    }
    return "down";
  } catch {
    return "down";
  }
}

/* ——— Root endpoint ——— */
app.get("/", (_req, res) => {
  res.json({
    name: "ChainForge API",
    version: "2.0.0",
    description: "The Firebase of Web3",
    endpoints: {
      docs: "/api/docs",
      health: "/health",
    },
  });
});

/* ——— Health / status ——— */
app.get("/health", async (_req, res) => {
  const mongodb = mongoose.connection.readyState === 1 ? "up" : "down";
  const redis = await cacheHealth();
  const chains = {};
  await Promise.all(
    Object.keys(CHAIN_REGISTRY).map(async (id) => {
      chains[id] = await checkChainHealth(id);
    }),
  );
  res.json({
    ok: true,
    version: "2.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    mongodb,
    redis,
    chains,
  });
});

app.get("/api/public/stats", async (_req, res, next) => {
  try {
    const [developers, users, apiCalls] = await Promise.all([
      User.countDocuments({ role: "client" }),
      User.countDocuments({ role: { $in: ["client", "admin"] } }),
      ApiUsageLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);
    res.json({
      developers,
      users,
      apiCallsToday: apiCalls,
      chains: Object.keys(CHAIN_REGISTRY).length,
    });
  } catch (e) {
    next(e);
  }
});

/** Inline API docs endpoint */
app.get("/api/docs", (_req, res) =>
  res.json({
    name: "ChainForge API",
    version: "2.0.0",
    endpoints: {
      "POST /api/client/signup/initiate": {
        body: { name: "string", email: "string", password: "string" },
        returns: "{ message, email, expiresIn, userId }",
      },
      "POST /api/client/signup/verify": {
        body: { email: "string", code: "string" },
        returns: "{ message, token, user }",
      },
      "POST /api/client/signup/resend": {
        body: { email: "string" },
        returns: "{ message, email, expiresIn }",
      },
      "POST /api/client/login/initiate": {
        body: { email: "string", password: "string" },
        returns: "{ message, email, expiresIn, userId, requiresVerification }",
      },
      "POST /api/client/login/verify": {
        body: { email: "string", code: "string" },
        returns: "{ message, token, user, sessionExpires }",
      },
      "POST /api/client/forgot-password": {
        body: { email: "string" },
        returns: "{ message, email, expiresIn }",
      },
      "POST /api/client/forgot-password/verify": {
        body: { email: "string", code: "string" },
        returns: "{ message, resetToken, expiresIn }",
      },
      "POST /api/client/reset-password": {
        body: { email: "string", resetToken: "string", newPassword: "string" },
        returns: "{ message }",
      },
      "POST /api/client/wallet-auth": {
        body: {
          walletAddress: "string",
          chain: "string",
          signature: "string",
          message: "string (from GET /api/auth/wallet/nonce)",
        },
        returns: "{ token, user, sessionExpires }",
      },
      "GET /api/client/session/check": {
        auth: "Bearer token",
        returns: "{ valid, expiresIn, expiresAt }",
      },
      "GET /api/client/login-history": {
        auth: "Bearer token",
        query: { method: "string?", limit: "number?", offset: "number?" },
        returns: "{ rows, total, limit, offset }",
      },
      "POST /api/admin/signup": {
        note: "Legacy route deprecated, returns 404",
      },
      "POST /api/admin/login": {
        note: "Legacy route deprecated, returns 404",
      },
      [`POST /api/admin/${ADMIN_ROUTE_SLUG}/signup`]: {
        body: {
          name: "string",
          email: "string",
          password: "string",
          adminCode: "string",
          totpCode: "string? for subsequent logins",
        },
        returns: "{ token, user, totpQrDataUrl }",
      },
      [`POST /api/admin/${ADMIN_ROUTE_SLUG}/login`]: {
        body: { email: "string", password: "string", totpCode: "string" },
        returns: "{ token, user }",
      },
      "GET /api/auth/google": { returns: "Redirect to Google OAuth" },
      "GET /api/auth/google/callback": { returns: "Redirect with JWT token" },
      "POST /api/auth/google/verify-idtoken": {
        body: { idToken: "string" },
        returns: "{ token, user }",
      },
      "GET /api/data/stats": {
        auth: "Bearer token",
        returns: "{ totalTransactions, activeApiKeys, activeSessions }",
      },
      "GET /api/data/transactions": {
        auth: "Bearer token",
        query: {
          chain: "string?",
          status: "string?",
          limit: "number?",
          offset: "number?",
        },
        returns: "{ rows, total, limit, offset }",
      },
      "GET /api/keys": {
        auth: "Bearer token",
        returns: "[{ id, mask, label, scopes, status, createdAt }]",
      },
      "POST /api/keys/generate": {
        auth: "Bearer token",
        body: { label: "string?", scopes: "string[]?" },
        returns: "{ id, rawKey, mask, message }",
      },
      "PATCH /api/keys/:id/revoke": {
        auth: "Bearer token",
        returns: "{ message, id }",
      },
      "GET /api/data/admin/overview": {
        auth: "Bearer token (admin)",
        returns:
          "{ totalUsers, totalTransactions, activeApiKeys, chainBreakdown }",
      },
      "GET /api/data/admin/users": {
        auth: "Bearer token (admin)",
        query: {
          q: "string?",
          chain: "string?",
          limit: "number?",
          offset: "number?",
        },
        returns: "{ rows, total }",
      },
      "GET /api/data/admin/transactions": {
        auth: "Bearer token (admin)",
        query: {
          chain: "string?",
          status: "string?",
          limit: "number?",
          offset: "number?",
        },
        returns: "{ rows, total }",
      },
      "PATCH /api/data/admin/users/:id/status": {
        auth: "Bearer token (admin)",
        body: { status: "'Active' | 'Suspended'" },
        returns: "User object",
      },
      "GET /api/data/admin/chain-stats": {
        auth: "Bearer token (admin)",
        returns: "{ [chainId]: { users, txs } }",
      },
      "GET /api/wallets": {
        auth: "Bearer token",
        returns: "{ wallets, primaryWalletId, preferences }",
      },
      "POST /api/wallets/link": {
        auth: "Bearer token",
        body: {
          address: "string",
          chain: "string",
          type: "string",
          label: "string?",
        },
        returns: "{ message, wallet }",
      },
      "DELETE /api/wallets/:id": {
        auth: "Bearer token",
        returns: "{ message }",
      },
      "PATCH /api/wallets/:id/primary": {
        auth: "Bearer token",
        returns: "{ message, primaryWallet }",
      },
      "PATCH /api/wallets/:id/label": {
        auth: "Bearer token",
        body: { label: "string" },
        returns: "{ message, wallet }",
      },
      "GET /api/wallets/supported/list": {
        returns: "{ chains, walletTypes }",
      },
      "GET /api/onchain/history/:address": {
        auth: "Bearer token",
        query: { chain: "string", limit: "number?", offset: "number?" },
        returns: "{ success, data: { rows, total, limit, offset } }",
      },
      "GET /api/onchain/balance/:address": {
        auth: "Bearer token",
        returns: "{ success, data: { balance, nonce, blockNumber } }",
      },
      "POST /api/onchain/sync": {
        auth: "Bearer token",
        body: { address: "string", chain: "string" },
        returns: "Synced transaction count",
      },
      "POST /api/onchain/multisync": {
        auth: "Bearer token",
        returns: "Synced all user wallets",
      },
      "GET /api/onchain/chains": {
        returns: "List of supported 12 chains",
      },
      "GET /api/webhooks": {
        auth: "Bearer token",
        returns: "List of user webhooks",
      },
      "POST /api/webhooks": {
        auth: "Bearer token",
        body: { url: "string", events: "array", label: "string?" },
        returns: "Created webhook with secret",
      },
      "DELETE /api/webhooks/:id": {
        auth: "Bearer token",
        returns: "{ message }",
      },
      "POST /api/webhooks/:id/test": {
        auth: "Bearer token",
        returns: "Test result",
      },
      "POST /api/webhooks/:id/rotate-secret": {
        auth: "Bearer token",
        returns: "New secret",
      },
    },
  }),
);

/* ——— Routes ——— */
app.use("/api/client", clientAuthRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/auth", githubAuthRoutes);
app.use("/api/auth/wallet", walletAuthRoutes);
// Mount admin auth routes on the slug-based path ONLY.
// ADMIN_ROUTE_SLUG="admin" → /api/admin/admin would be wrong, so we
// always mount on /api/admin directly and the slug is purely for
// the frontend console URL prefix (set VITE_ADMIN_SLUG="" on client).
app.use("/api/admin", adminGuard, adminAuthRoutes);
app.use("/api/admin/mgmt", adminGuard, adminMgmtRoutes);
app.use("/api/keys", apiKeyRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/onchain", onchainRoutes);
app.use("/api/public", publicApiRoutes);
app.use("/api/webhooks", webhookRoutes);

/* ——— Error handling ——— */
app.use(notFoundHandler);
app.use(errorHandler);

/* ——— Start ——— */
async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGODB_URI in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    logger.info("MongoDB connected");
  } catch (err) {
    const isSrvDnsRefused =
      uri.startsWith("mongodb+srv://") &&
      /querySrv\s+ECONNREFUSED/i.test(err?.message || "");

    if (isSrvDnsRefused) {
      try {
        logger.warn(
          { dnsServers: PUBLIC_DNS_SERVERS },
          "MongoDB SRV lookup refused by local DNS; retrying with public DNS fallback",
        );
        const fallbackUri = await buildMongoDnsFallbackUri(uri);
        await mongoose.connect(fallbackUri);
        logger.info("MongoDB connected via SRV DNS fallback");
      } catch (fallbackErr) {
        logger.error(
          { err: fallbackErr.message },
          "MongoDB fallback connection failed",
        );
        process.exit(1);
      }
    } else {
      logger.error({ err: err.message }, "MongoDB connection failed");
      process.exit(1);
    }
  }

  await seedAdminCodes();
  await seedDefaultAdmin();
  await seedDefaultClient();
  startUsageAggregationJob();

  const server = app.listen(PORT, () => {
    logger.info(`ChainForge API v2.0.0 listening on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        `Port ${PORT} already in use. Stop other process or set different PORT.`,
      );
    } else {
      logger.error({ err }, "Server error");
    }
    process.exit(1);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down");
  await mongoose.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mongoose.disconnect();
  process.exit(0);
});

start().catch((e) => {
  logger.error({ err: e }, "Fatal startup error");
  process.exit(1);
});
