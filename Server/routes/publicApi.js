import express from "express";
import { apiKeyAuth, requireApiKeyScopes } from "../middleware/apiKeyAuth.js";
import onchainService from "../services/onchainDataService.js";

const router = express.Router();

// External developer API: authenticated via API key, not JWT session.
router.use(apiKeyAuth);

router.get("/balance", requireApiKeyScopes(["read:balance"]), async (req, res, next) => {
  try {
    const address = String(req.query.address || "");
    const chain = String(req.query.chain || "ethereum");
    if (!address) return res.status(400).json({ error: "address is required" });
    const data = await onchainService.getBalance(address, chain);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get("/history", requireApiKeyScopes(["read:history"]), async (req, res, next) => {
  try {
    const address = String(req.query.address || "");
    const chain = String(req.query.chain || "ethereum");
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    if (!address) return res.status(400).json({ error: "address is required" });
    const data = await onchainService.getHistory(address, chain, { limit, offset });
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get("/gas", requireApiKeyScopes(["read:balance"]), async (req, res, next) => {
  try {
    const chain = String(req.query.chain || "ethereum");
    const data = await onchainService.getGasPrice(chain);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

export default router;

