import express from "express";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import ApiKey from "../models/ApiKey.js";
import AuditLog from "../models/AuditLog.js";
import Webhook from "../models/Webhook.js";
import RequestLog from "../models/RequestLog.js";
import { adminGuard } from "../middleware/adminGuard.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";
import { adminApiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(requireAuth);

function clampInt(value, min, max, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekStartKey(dayKey) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  const weekStart = new Date(date.getTime() - offset * 24 * 60 * 60 * 1000);
  return formatDateKey(weekStart);
}

function bucketSeriesByInterval(series, interval) {
  if (interval !== "week") return series;
  const bucket = new Map();
  for (const entry of series) {
    const key = getWeekStartKey(entry.day);
    bucket.set(key, (bucket.get(key) || 0) + (entry.total || 0));
  }
  return Array.from(bucket.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, total]) => ({ day, total }));
}

function buildUserChainEntriesProject() {
  return {
    userId: "$_id",
    entries: {
      $concatArrays: [
        {
          $cond: [
            {
              $and: [{ $ne: ["$chain", ""] }, { $ne: ["$chain", null] }],
            },
            [{ chain: "$chain", at: "$createdAt" }],
            [],
          ],
        },
        {
          $map: {
            input: { $ifNull: ["$wallets", []] },
            as: "wallet",
            in: {
              chain: "$$wallet.chain",
              at: { $ifNull: ["$$wallet.addedAt", "$createdAt"] },
            },
          },
        },
      ],
    },
  };
}

async function aggregateUsersByChain({ start = null, end = null } = {}) {
  const timeMatch = {};
  if (start) timeMatch.$gte = start;
  if (end) timeMatch.$lt = end;
  const hasTime = Object.keys(timeMatch).length > 0;

  return User.aggregate([
    { $project: buildUserChainEntriesProject() },
    { $unwind: "$entries" },
    {
      $match: {
        "entries.chain": { $nin: ["", null] },
        ...(hasTime ? { "entries.at": timeMatch } : {}),
      },
    },
    {
      $group: {
        _id: { chain: "$entries.chain", userId: "$userId" },
      },
    },
    {
      $group: {
        _id: "$_id.chain",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
}

/** Fetch current user profile */
router.get("/me", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      id: user._id.toString(),
      email: user.email || "",
      name: user.name || "",
      role: user.role,
      authMethod: user.authMethod,
      avatarUrl: user.avatarUrl || "",
    });
  } catch (e) {
    next(e);
  }
});

router.use("/admin", adminGuard, requireAdmin);

/** Stats overview for client dashboard */
router.get("/stats", async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const [txCount, apiKeyCount] = await Promise.all([
      Transaction.countDocuments({ userId }),
      ApiKey.countDocuments({ userId, revokedAt: null }),
    ]);
    return res.json({
      totalTransactions: txCount,
      activeApiKeys: apiKeyCount,
      activeSessions: 1,
    });
  } catch (e) {
    next(e);
  }
});

/** Recent transactions for current user */
router.get("/transactions", async (req, res, next) => {
  try {
    const { chain, status, limit = 20, offset = 0 } = req.query;
    const filter = { userId: req.user.sub };
    if (chain && chain !== "all") filter.chain = chain;
    if (status && status !== "all") filter.status = status;

    const [rows, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Math.min(Number(limit), 100)),
      Transaction.countDocuments(filter),
    ]);

    return res.json({
      rows,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: platform-wide stats */
router.get("/admin/overview", adminApiLimiter, async (_req, res, next) => {
  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      totalUsers,
      newUsers7d,
      totalTx,
      totalApiKeys,
      totalWebhooks,
      usersByChain,
      txByChain,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: since7d } }),
      Transaction.countDocuments(),
      ApiKey.countDocuments({ revokedAt: null }),
      Webhook.countDocuments(),
      aggregateUsersByChain(),
      Transaction.aggregate([
        {
          $group: {
            _id: "$chain",
            txCount: { $sum: 1 },
            totalAmount: {
              $sum: {
                $convert: {
                  input: "$amount",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },
          },
        },
        { $sort: { txCount: -1 } },
      ]),
    ]);

    const userMap = new Map(
      usersByChain.map((row) => [row._id || "unknown", row.count || 0]),
    );

    const chains = new Set([
      ...Array.from(userMap.keys()),
      ...txByChain.map((row) => row._id || "unknown"),
    ]);

    const chainBreakdown = Array.from(chains)
      .map((chain) => {
        const txRow = txByChain.find((row) => (row._id || "unknown") === chain);
        return {
          chain,
          users: userMap.get(chain) || 0,
          txCount: txRow?.txCount || 0,
          totalAmount: txRow?.totalAmount || 0,
        };
      })
      .sort((a, b) => b.txCount - a.txCount);

    return res.json({
      totalUsers,
      newUsers7d,
      totalTransactions: totalTx,
      activeApiKeys: totalApiKeys,
      totalWebhooks,
      mrr: 0,
      chainBreakdown,
      topChainsByUsers: [...chainBreakdown]
        .sort((a, b) => b.users - a.users)
        .slice(0, 5),
      topChainsByVolume: [...chainBreakdown]
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5),
    });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: audit log rows */
router.get("/admin/audit-log", adminApiLimiter, async (req, res, next) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));
    const rows = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("adminId", "email name role");
    return res.json({ rows });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: geo endpoint (placeholder) */
router.get("/admin/geo", adminApiLimiter, async (_req, res) => {
  // We don't collect geo yet; return empty for UI compatibility.
  return res.json([]);
});

/** Client + Admin: request logs summary */
router.get("/usage/summary", async (req, res, next) => {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days || 14)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const match = { createdAt: { $gte: since }, userId: req.user.sub };
    const rows = await RequestLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            day: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
          },
          total: { $sum: 1 },
          p95: {
            $percentile: {
              input: "$latencyMs",
              p: [0.95],
              method: "approximate",
            },
          },
          errors: { $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] } },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);
    return res.json({
      days,
      series: rows.map((r) => ({
        day: r._id.day,
        total: r.total,
        errors: r.errors,
        p95LatencyMs: Array.isArray(r.p95) ? r.p95[0] : null,
      })),
    });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: platform-wide request logs summary */
router.get("/admin/usage/summary", adminApiLimiter, async (req, res, next) => {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days || 14)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await RequestLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
          },
          total: { $sum: 1 },
          errors: { $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] } },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);
    return res.json({
      days,
      series: rows.map((r) => ({
        day: r._id.day,
        total: r.total,
        errors: r.errors,
      })),
    });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: list all users with pagination and filtering */
router.get("/admin/users", adminApiLimiter, async (req, res, next) => {
  try {
    const {
      q = "",
      chain = "all",
      status = "all",
      authMethod = "all",
      limit = 50,
      offset = 0,
    } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: "i" } },
        { walletAddress: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }

    if (chain && chain !== "all") filter.chain = chain;
    if (status && status !== "all") filter.status = status;
    if (authMethod && authMethod !== "all") filter.authMethod = authMethod;

    const [rows, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Math.min(Number(limit), 200)),
      User.countDocuments(filter),
    ]);

    return res.json({ rows, total });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: list all transactions */
router.get("/admin/transactions", adminApiLimiter, async (req, res, next) => {
  try {
    const {
      q = "",
      chain = "all",
      status = "all",
      limit = 50,
      offset = 0,
    } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { hash: { $regex: q, $options: "i" } },
        { from: { $regex: q, $options: "i" } },
        { to: { $regex: q, $options: "i" } },
      ];
    }

    if (chain !== "all") filter.chain = chain;
    if (status !== "all") filter.status = status;

    const [rows, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Math.min(Number(limit), 200))
        .populate("userId", "name email"),
      Transaction.countDocuments(filter),
    ]);

    return res.json({ rows, total });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: suspend / activate a user */
router.patch("/admin/users/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["Active", "Suspended"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Status must be Active or Suspended" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    ).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });
    await AuditLog.create({
      adminId: req.user.sub,
      action: "admin.user.status.update",
      targetType: "user",
      targetId: user._id.toString(),
      ip: req.ip,
      userAgent: req.get("user-agent") || "",
      diff: { status },
    });
    return res.json(user);
  } catch (e) {
    next(e);
  }
});

/** Admin-only: list all API keys across the platform (masked only) */
router.get("/admin/api-keys", adminApiLimiter, async (req, res, next) => {
  try {
    const {
      q = "",
      status = "all",
      userId = "",
      limit = 100,
      offset = 0,
    } = req.query;
    const filter = {};

    if (status === "active") filter.revokedAt = null;
    else if (status === "revoked") filter.revokedAt = { $ne: null };

    if (userId) {
      filter.userId = userId;
    }

    if (q) {
      // Find matching users to include in key search
      const matchedUsers = await User.find({
        $or: [
          { email: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
        ],
      }).select("_id");

      const userIds = matchedUsers.map((u) => u._id);

      filter.$or = [
        { label: { $regex: q, $options: "i" } },
        { mask: { $regex: q, $options: "i" } },
        { userId: { $in: userIds } },
      ];
    }

    const [rows, total] = await Promise.all([
      ApiKey.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Math.min(Number(limit), 200))
        .select("-keyHash")
        .populate("userId", "name email walletAddress chain authMethod status"),
      ApiKey.countDocuments(filter),
    ]);

    return res.json({
      rows: rows.map((k) => ({
        id: k._id.toString(),
        mask: k.mask,
        label: k.label,
        scopes: k.scopes,
        environment: k.environment,
        rateLimitRpm: k.rateLimitRpm,
        status: k.revokedAt ? "Revoked" : "Active",
        revokedAt: k.revokedAt,
        rotatedAt: k.rotatedAt,
        lastUsedAt: k.lastUsedAt,
        usageCount: k.usageCount || 0,
        createdAt: k.createdAt,
        owner: k.userId
          ? {
              id: k.userId._id.toString(),
              name: k.userId.name || "",
              email: k.userId.email || "",
              walletAddress: k.userId.walletAddress || "",
              authMethod: k.userId.authMethod || "",
              status: k.userId.status || "",
            }
          : null,
      })),
      total,
    });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: update user status (Suspened/Active) */
router.patch("/admin/users/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["Active", "Suspended"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Status must be Active or Suspended" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    ).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (e) {
    next(e);
  }
});

/** Admin-only: Rotate an API key for any user */
router.post("/admin/api-keys/:id/rotate", async (req, res, next) => {
  try {
    const key = await ApiKey.findById(req.params.id);
    if (!key) return res.status(404).json({ error: "Key not found" });

    const rotated = await ApiKey.generate(
      key.userId,
      key.label,
      key.scopes,
      key.environment,
      key.rateLimitRpm,
      key.expiresAt,
    );

    key.keyHash = rotated.keyHash;
    key.hashAlg = rotated.hashAlg;
    key.mask = rotated.mask;
    key.rotatedAt = new Date();
    await key.save();

    return res.json({ id: key._id, rawKey: rotated.rawKey, mask: key.mask });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: Revoke/Drop an API key */
router.patch("/admin/api-keys/:id/revoke", async (req, res, next) => {
  try {
    await ApiKey.deleteOne({ _id: req.params.id });
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: Generate new API key for a user */
router.post("/admin/api-keys/generate", async (req, res, next) => {
  try {
    const { userId, label, scopes, environment, rateLimitRpm } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const key = await ApiKey.generate(
      userId,
      label,
      scopes,
      environment,
      rateLimitRpm,
    );
    return res
      .status(201)
      .json({ id: key._id, rawKey: key.rawKey, mask: key.mask });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: chain-level stats */
router.get("/admin/chain-stats", adminApiLimiter, async (_req, res, next) => {
  try {
    const [usersByChain, txsByChain] = await Promise.all([
      aggregateUsersByChain(),
      Transaction.aggregate([{ $group: { _id: "$chain", txs: { $sum: 1 } } }]),
    ]);

    const statsMap = {};
    for (const { _id, count } of usersByChain) {
      statsMap[_id] = { users: count || 0, txs: 0 };
    }
    for (const { _id, txs } of txsByChain) {
      if (!statsMap[_id]) statsMap[_id] = { users: 0, txs: 0 };
      statsMap[_id].txs = txs;
    }

    return res.json(statsMap);
  } catch (e) {
    next(e);
  }
});

/** Admin-only: chain transaction volume by chain */
router.get("/admin/analytics/chain-volume", adminApiLimiter, async (req, res, next) => {
  try {
    const days = clampInt(req.query.days || 30, 1, 365, 30);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await Transaction.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$chain",
          txCount: { $sum: 1 },
          totalAmount: {
            $sum: {
              $convert: {
                input: "$amount",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    return res.json({
      days,
      rows: rows.map((row) => ({
        chain: row._id || "unknown",
        txCount: row.txCount || 0,
        totalAmount: row.totalAmount || 0,
      })),
    });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: fastest growing chains by transaction count */
router.get("/admin/analytics/chain-growth", adminApiLimiter, async (req, res, next) => {
  try {
    const windowDays = clampInt(req.query.windowDays || 7, 1, 60, 7);
    const metric = ["transactions", "users", "combined"].includes(
      String(req.query.metric || "combined"),
    )
      ? String(req.query.metric || "combined")
      : "combined";

    const now = new Date();
    const currentStart = new Date(
      now.getTime() - windowDays * 24 * 60 * 60 * 1000,
    );
    const previousStart = new Date(
      now.getTime() - windowDays * 2 * 24 * 60 * 60 * 1000,
    );

    const [currentTxRows, previousTxRows, currentUserRows, previousUserRows] =
      await Promise.all([
        Transaction.aggregate([
          { $match: { createdAt: { $gte: currentStart } } },
          { $group: { _id: "$chain", count: { $sum: 1 } } },
        ]),
        Transaction.aggregate([
          { $match: { createdAt: { $gte: previousStart, $lt: currentStart } } },
          { $group: { _id: "$chain", count: { $sum: 1 } } },
        ]),
        aggregateUsersByChain({ start: currentStart, end: now }),
        aggregateUsersByChain({ start: previousStart, end: currentStart }),
      ]);

    const currentTxMap = new Map(
      currentTxRows.map((row) => [row._id || "unknown", row.count || 0]),
    );
    const previousTxMap = new Map(
      previousTxRows.map((row) => [row._id || "unknown", row.count || 0]),
    );
    const currentUserMap = new Map(
      currentUserRows.map((row) => [row._id || "unknown", row.count || 0]),
    );
    const previousUserMap = new Map(
      previousUserRows.map((row) => [row._id || "unknown", row.count || 0]),
    );

    const toGrowthPct = (currentValue, previousValue) => {
      if (previousValue > 0) {
        return (
          Math.round(((currentValue - previousValue) / previousValue) * 1000) /
          10
        );
      }
      return currentValue > 0 ? null : 0;
    };

    const chains = new Set([
      ...currentTxMap.keys(),
      ...previousTxMap.keys(),
      ...currentUserMap.keys(),
      ...previousUserMap.keys(),
    ]);

    const rows = Array.from(chains).map((chain) => {
      const currentTxs = currentTxMap.get(chain) || 0;
      const previousTxs = previousTxMap.get(chain) || 0;
      const currentUsers = currentUserMap.get(chain) || 0;
      const previousUsers = previousUserMap.get(chain) || 0;
      const txGrowthPct = toGrowthPct(currentTxs, previousTxs);
      const userGrowthPct = toGrowthPct(currentUsers, previousUsers);

      const txScore =
        txGrowthPct == null ? (currentTxs > 0 ? 100 : 0) : txGrowthPct;
      const userScore =
        userGrowthPct == null ? (currentUsers > 0 ? 100 : 0) : userGrowthPct;
      const combinedGrowthScore =
        Math.round((txScore * 0.6 + userScore * 0.4) * 10) / 10;

      return {
        chain,
        currentTxs,
        previousTxs,
        txGrowthPct,
        currentUsers,
        previousUsers,
        userGrowthPct,
        combinedGrowthScore,
      };
    });

    rows.sort((a, b) => {
      if (metric === "transactions") {
        const aValue = a.txGrowthPct ?? -Infinity;
        const bValue = b.txGrowthPct ?? -Infinity;
        if (aValue !== bValue) return bValue - aValue;
        return b.currentTxs - a.currentTxs;
      }
      if (metric === "users") {
        const aValue = a.userGrowthPct ?? -Infinity;
        const bValue = b.userGrowthPct ?? -Infinity;
        if (aValue !== bValue) return bValue - aValue;
        return b.currentUsers - a.currentUsers;
      }
      if (a.combinedGrowthScore !== b.combinedGrowthScore) {
        return b.combinedGrowthScore - a.combinedGrowthScore;
      }
      if (b.currentTxs !== a.currentTxs) return b.currentTxs - a.currentTxs;
      return b.currentUsers - a.currentUsers;
    });

    return res.json({ windowDays, metric, rows });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: user acquisition over time */
router.get("/admin/analytics/user-acquisition", adminApiLimiter, async (req, res, next) => {
  try {
    const days = clampInt(req.query.days || 90, 7, 365, 90);
    const interval = req.query.interval === "week" ? "week" : "day";
    const topChains = clampInt(req.query.topChains || 8, 1, 20, 8);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await User.aggregate([
      { $project: buildUserChainEntriesProject() },
      { $unwind: "$entries" },
      {
        $match: {
          "entries.chain": { $nin: ["", null] },
          "entries.at": { $gte: since },
        },
      },
      {
        $project: {
          userId: 1,
          chain: "$entries.chain",
          day: { $dateToString: { date: "$entries.at", format: "%Y-%m-%d" } },
        },
      },
      {
        $group: {
          _id: { day: "$day", chain: "$chain", userId: "$userId" },
        },
      },
      {
        $group: {
          _id: { day: "$_id.day", chain: "$_id.chain" },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    const overallByDay = new Map();
    const chainDayMap = new Map();
    const chainTotals = new Map();

    for (const row of rows) {
      const day = row._id.day;
      const chain = row._id.chain || "unknown";
      const total = row.total || 0;

      overallByDay.set(day, (overallByDay.get(day) || 0) + total);

      if (!chainDayMap.has(chain)) chainDayMap.set(chain, new Map());
      const dayMap = chainDayMap.get(chain);
      dayMap.set(day, (dayMap.get(day) || 0) + total);

      chainTotals.set(chain, (chainTotals.get(chain) || 0) + total);
    }

    const series = bucketSeriesByInterval(
      Array.from(overallByDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, total]) => ({ day, total })),
      interval,
    );

    const selectedChains = Array.from(chainTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topChains)
      .map(([chain]) => chain);

    const byChain = selectedChains.map((chain) => {
      const rawSeries = Array.from(chainDayMap.get(chain).entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, total]) => ({ day, total }));
      return {
        chain,
        total: chainTotals.get(chain) || 0,
        series: bucketSeriesByInterval(rawSeries, interval),
      };
    });

    return res.json({ days, interval, series, byChain });
  } catch (e) {
    next(e);
  }
});

/** Admin-only: API key usage summary */
router.get("/admin/analytics/api-key-usage", adminApiLimiter, async (req, res, next) => {
  try {
    const days = clampInt(req.query.days || 30, 1, 365, 30);
    const limit = clampInt(req.query.limit || 50, 1, 200, 50);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const usageRows = await RequestLog.aggregate([
      {
        $match: {
          authType: "apiKey",
          apiKeyId: { $ne: null },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: "$apiKeyId",
          total: { $sum: 1 },
          errors: { $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] } },
          lastUsedAt: { $max: "$createdAt" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: limit },
    ]);

    const ids = usageRows.map((row) => row._id).filter(Boolean);

    const [keys, trendRows] = await Promise.all([
      ApiKey.find({ _id: { $in: ids } })
        .select("mask label environment userId")
        .lean(),
      RequestLog.aggregate([
        {
          $match: {
            authType: "apiKey",
            apiKeyId: { $in: ids },
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              apiKeyId: "$apiKeyId",
              day: {
                $dateToString: {
                  date: "$createdAt",
                  format: "%Y-%m-%d",
                },
              },
            },
            total: { $sum: 1 },
            errors: {
              $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] },
            },
          },
        },
        { $sort: { "_id.day": 1 } },
      ]),
    ]);

    const keyMap = new Map(keys.map((key) => [key._id.toString(), key]));
    const ownerIds = keys.map((key) => key.userId?.toString()).filter(Boolean);
    const owners = await User.find({ _id: { $in: ownerIds } })
      .select("name email")
      .lean();
    const ownerMap = new Map(
      owners.map((owner) => [owner._id.toString(), owner]),
    );

    const trendMap = new Map();
    for (const row of trendRows) {
      const apiKeyId = row._id.apiKeyId.toString();
      if (!trendMap.has(apiKeyId)) trendMap.set(apiKeyId, []);
      trendMap.get(apiKeyId).push({
        day: row._id.day,
        total: row.total || 0,
        errors: row.errors || 0,
      });
    }

    const rows = usageRows.map((row) => {
      const apiKeyId = row._id.toString();
      const key = keyMap.get(apiKeyId);
      const ownerId = key?.userId?.toString() || null;
      const owner = ownerId ? ownerMap.get(ownerId) : null;

      return {
        apiKeyId,
        mask: key?.mask || "",
        label: key?.label || "",
        environment: key?.environment || "live",
        ownerId,
        owner: owner
          ? {
              id: ownerId,
              name: owner.name || "",
              email: owner.email || "",
            }
          : null,
        total: row.total || 0,
        errors: row.errors || 0,
        lastUsedAt: row.lastUsedAt || null,
        series: trendMap.get(apiKeyId) || [],
      };
    });

    return res.json({ days, rows });
  } catch (e) {
    next(e);
  }
});

export default router;
