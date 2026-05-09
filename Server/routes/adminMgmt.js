import express from "express";
import AdminCode from "../models/AdminCode.js";
import AuditLog from "../models/AuditLog.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";
import { adminApiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "CF-ADMIN-";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

router.get("/codes", adminApiLimiter, async (_req, res) => {
  try {
    const codes = await AdminCode.find().sort({ createdAt: -1 });
    return res.json(
      codes.map((c) => ({
        id: c._id.toString(),
        code: c.code,
        used: c.used,
        createdAt: c.createdAt,
      }))
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

router.post("/codes/generate", adminApiLimiter, async (_req, res) => {
  try {
    let code;
    for (let i = 0; i < 10; i++) {
      code = randomCode();
      const clash = await AdminCode.findOne({ code });
      if (!clash) break;
    }
    const doc = await AdminCode.create({ code, used: false });
    await AuditLog.create({
      adminId: _req.user.sub,
      action: "admin.code.generate",
      targetType: "admin_code",
      targetId: doc._id.toString(),
      ip: _req.ip,
      userAgent: _req.get("user-agent") || "",
      diff: { code: doc.code },
    });
    return res.json({ code: doc.code });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// Get all admin users
router.get("/users", adminApiLimiter, async (_req, res) => {
  try {
    const User = (await import("../models/User.js")).default;
    const admins = await User.find({ role: "admin" })
      .select("name email status createdAt emailVerified")
      .sort({ createdAt: -1 });

    return res.json(admins.map(admin => ({
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      status: admin.status,
      emailVerified: admin.emailVerified,
      createdAt: admin.createdAt
    })));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// Update admin user status
router.patch("/users/:id/status", adminApiLimiter, async (req, res) => {
  try {
    const { status } = req.body;
    const User = (await import("../models/User.js")).default;

    // Only super admin can change other admin status
    const currentUser = await User.findById(req.user.sub);
    if (currentUser.email !== "yasirfaizan680@gmail.com") {
      return res.status(403).json({ error: "Only super admin can change admin status" });
    }

    const admin = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      adminId: req.user.sub,
      action: "admin.status.update",
      targetType: "admin",
      targetId: req.params.id,
      ip: req.ip,
      userAgent: req.get("user-agent") || "",
      diff: { status, oldStatus: admin.status },
    });

    return res.json({
      message: `Admin ${status} successfully`,
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        status: admin.status
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

export default router;
