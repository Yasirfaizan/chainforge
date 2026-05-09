import express from "express";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import onchainService from "../services/onchainDataService.js";
import webhookService from "../services/webhookService.js";
import { CHAIN_REGISTRY } from "../config/chains.js";

const router = express.Router();

function toStatusFromRow(row) {
  const raw = String(row?.status || "").toLowerCase();
  if (raw.includes("fail") || raw.includes("drop") || raw.includes("revert")) {
    return "Failed";
  }
  if (raw.includes("pending")) {
    return "Pending";
  }
  return "Confirmed";
}

async function persistSyncedTransactions({ userId, chain, address, rows }) {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) return { upserted: 0, matched: 0 };

  const operations = items
    .filter((row) => row?.hash)
    .map((row) => ({
      updateOne: {
        filter: { userId, chain, hash: row.hash },
        update: {
          $setOnInsert: {
            userId,
            chain,
            hash: row.hash,
            from: row.from || "",
            to: row.to || "",
            amount: String(row.amount ?? "0"),
            status: toStatusFromRow(row),
            metadata: {
              walletAddress: address,
              syncedAt: new Date().toISOString(),
              source: "onchain.sync",
              summary: row.summary || "",
              sourceTimestamp: row.timestamp || null,
            },
          },
          $set: {
            from: row.from || "",
            to: row.to || "",
            amount: String(row.amount ?? "0"),
            status: toStatusFromRow(row),
            metadata: {
              walletAddress: address,
              syncedAt: new Date().toISOString(),
              source: "onchain.sync",
              summary: row.summary || "",
              sourceTimestamp: row.timestamp || null,
            },
          },
        },
        upsert: true,
      },
    }));

  if (!operations.length) return { upserted: 0, matched: 0 };

  const result = await Transaction.bulkWrite(operations, { ordered: false });
  return {
    upserted: result.upsertedCount || 0,
    matched: result.matchedCount || 0,
  };
}

/**
 * GET /api/onchain/chains
 * List supported chains with metadata (Public)
 */
router.get("/chains", (_req, res) => {
  const chains = Object.values(CHAIN_REGISTRY);
  res.json({ success: true, data: chains });
});

// Protect all following routes
router.use(requireAuth);

/**
 * GET /api/onchain/history/:address
 * Get human-readable transaction history for an address
 */
router.get("/history/:address", async (req, res, next) => {
  try {
    const { address } = req.params;
    const { chain = "ethereum", limit = 20, offset = 0 } = req.query;

    // Verify user owns this wallet
    const user = await User.findById(req.user.sub);
    const ownsWallet =
      user.wallets.some(
        (w) => w.address.toLowerCase() === address.toLowerCase(),
      ) || user.walletAddress?.toLowerCase() === address.toLowerCase();

    if (!ownsWallet) {
      return res.status(403).json({
        error: "You can only view history for your linked wallets",
      });
    }

    const history = await onchainService.getHistory(address, chain, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    res.json({
      success: true,
      query: { address, chain, limit: Number(limit), offset: Number(offset) },
      data: history,
    });
  } catch (error) {
    console.error("Error fetching on-chain history:", error);
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: error.message },
    });
  }
});

/**
 * GET /api/onchain/balance/:address
 * Get token balances for an address
 */
router.get("/balance/:address", async (req, res, next) => {
  try {
    const { address } = req.params;
    const { chain = "ethereum" } = req.query;

    // Verify ownership
    const user = await User.findById(req.user.sub);
    const ownsWallet =
      user.wallets.some(
        (w) => w.address.toLowerCase() === address.toLowerCase(),
      ) || user.walletAddress?.toLowerCase() === address.toLowerCase();

    if (!ownsWallet) {
      return res.status(403).json({
        error: "You can only view balances for your linked wallets",
      });
    }

    const balances = await onchainService.getBalance(address, chain);
    res.json({ success: true, query: { address, chain }, data: balances });
  } catch (error) {
    console.error("Error fetching balances:", error);
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: error.message },
    });
  }
});

/**
 * POST /api/onchain/sync
 * Sync blockchain transactions to our database
 */
router.post(
  "/sync",
  validate({ address: "string", chain: "string" }),
  async (req, res, next) => {
    try {
      const { address, chain } = req.body;
      const userId = req.user.sub;

      // Verify ownership
      const user = await User.findById(userId);
      const ownsWallet =
        user.wallets.some(
          (w) =>
            w.address.toLowerCase() === address.toLowerCase() &&
            w.chain === chain,
        ) ||
        (user.walletAddress?.toLowerCase() === address.toLowerCase() &&
          user.chain === chain);

      if (!ownsWallet) {
        return res.status(403).json({
          error: "You can only sync your linked wallets",
        });
      }

      const result = await onchainService.getHistory(address, chain, {
        limit: 50,
        offset: 0,
      });

      const persisted = await persistSyncedTransactions({
        userId: user._id,
        chain,
        address,
        rows: result.rows,
      });

      // Trigger webhook events for each transaction
      if (result.rows && result.rows.length > 0) {
        for (const tx of result.rows) {
          // Determine if transaction is incoming or outgoing
          const normalizedAddress = address.toLowerCase();
          const normalizedFrom = (tx.from || "").toLowerCase();
          const normalizedTo = (tx.to || "").toLowerCase();

          if (normalizedFrom === normalizedAddress) {
            // Outgoing transaction
            webhookService
              .triggerEvent(
                userId,
                "transaction.outgoing",
                webhookService.EventBuilders.transaction(tx, "outgoing"),
                { chain, walletAddress: address },
              )
              .catch(() => {});
          } else if (normalizedTo === normalizedAddress) {
            // Incoming transaction
            webhookService
              .triggerEvent(
                userId,
                "transaction.incoming",
                webhookService.EventBuilders.transaction(tx, "incoming"),
                { chain, walletAddress: address },
              )
              .catch(() => {});
          }
        }
      }

      res.json({
        success: true,
        message: `Synced ${result.rows.length} transactions`,
        persisted,
        data: result,
      });
    } catch (error) {
      console.error("Error syncing transactions:", error);
      res.status(500).json({
        success: false,
        error: { code: "SYNC_ERROR", message: error.message },
      });
    }
  },
);

/**
 * GET /api/onchain/humanize/:hash
 * Get human-readable details for a specific transaction
 */
router.get("/humanize/:hash", async (req, res, next) => {
  try {
    const { hash } = req.params;
    const { chain = "ethereum" } = req.query;

    const humanized = onchainService.humanize(
      {
        hash,
        from: "",
        to: "",
        value: "0",
        timestamp: Math.floor(Date.now() / 1000),
      },
      chain,
    );
    res.json({ success: true, query: { hash, chain }, data: humanized });
  } catch (error) {
    console.error("Error humanizing transaction:", error);
    res.status(500).json({
      success: false,
      error: { code: "HUMANIZE_ERROR", message: error.message },
    });
  }
});

router.get("/gas", async (req, res, next) => {
  try {
    const chain = String(req.query.chain || "ethereum");
    const gas = await onchainService.getGasPrice(chain);
    res.json({ success: true, data: gas });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/onchain/multisync
 * Sync all user wallets across chains
 */
router.post("/multisync", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    const results = [];

    // Sync legacy wallet
    if (user.walletAddress && user.chain) {
      try {
        const result = await onchainService.getHistory(
          user.walletAddress,
          user.chain,
          { limit: 20, offset: 0 },
        );
        const persisted = await persistSyncedTransactions({
          userId: user._id,
          chain: user.chain,
          address: user.walletAddress,
          rows: result.rows,
        });
        results.push({
          address: user.walletAddress,
          chain: user.chain,
          synced: result.rows.length,
          persisted,
        });
      } catch (e) {
        results.push({
          address: user.walletAddress,
          chain: user.chain,
          error: e.message,
        });
      }
    }

    // Sync all linked wallets
    for (const wallet of user.wallets) {
      try {
        const result = await onchainService.getHistory(
          wallet.address,
          wallet.chain,
          { limit: 20, offset: 0 },
        );
        const persisted = await persistSyncedTransactions({
          userId: user._id,
          chain: wallet.chain,
          address: wallet.address,
          rows: result.rows,
        });
        results.push({
          address: wallet.address,
          chain: wallet.chain,
          synced: result.rows.length,
          persisted,
        });
      } catch (e) {
        results.push({
          address: wallet.address,
          chain: wallet.chain,
          error: e.message,
        });
      }
    }

    const totalSynced = results.reduce((acc, r) => acc + (r.synced || 0), 0);

    res.json({
      success: true,
      message: `Synced ${totalSynced} transactions across ${results.length} wallets`,
      data: results,
    });
  } catch (error) {
    console.error("Error in multisync:", error);
    res.status(500).json({
      success: false,
      error: { code: "MULTISYNC_ERROR", message: error.message },
    });
  }
});

export default router;
