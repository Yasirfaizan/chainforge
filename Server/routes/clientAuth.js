import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import signupRoutes from "./auth/signup.js";
import loginRoutes from "./auth/login.js";
import passwordRoutes from "./auth/password.js";
import walletAuthRoutes from "./auth/walletAuth.js";

const router = express.Router();

// Mount split route modules
router.use("/signup", signupRoutes);
router.use("/login", loginRoutes);
// Password routes define /forgot-password, /forgot-password/verify, /reset-password
// Mount at root (not /password) so client calls like /api/client/forgot-password resolve correctly
router.use("/", passwordRoutes);
router.use(walletAuthRoutes);

// Protected routes for authenticated users
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.user.sub);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    function clientPayload(user) {
      return {
        id: user._id.toString(),
        email: user.email || "",
        name: user.name || "",
        role: "client",
        walletAddress: user.walletAddress || "",
        chain: user.chain || "",
        authMethod: user.authMethod,
        status: user.status || "Pending",
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        wallets: user.wallets || [],
        preferences: user.preferences || {},
        sessionExpiresAt: user.sessionExpiresAt,
      };
    }

    res.json({ user: clientPayload(user) });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.user.sub);
    
    if (user) {
      await user.clearSession();
    }

    res.json({ message: "Logged out successfully" });
  } catch (e) {
    next(e);
  }
});

router.post("/refresh", requireAuth, async (req, res, next) => {
  try {
    const User = (await import("../models/User.js")).default;
    const { signToken } = (await import("../util/jwt.js"));
    
    const user = await User.findById(req.user.sub);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.isSessionValid()) {
      await user.clearSession();
      return res.status(401).json({
        error: "Session expired. Please log in again.",
        code: "SESSION_EXPIRED"
      });
    }

    // Refresh session
    await user.refreshSession();

    // Generate new token
    const token = signToken(
      {
        sub: user._id.toString(),
        role: "client",
        email: user.email,
      },
      "30d",
    );

    function clientPayload(user) {
      return {
        id: user._id.toString(),
        email: user.email || "",
        name: user.name || "",
        role: "client",
        walletAddress: user.walletAddress || "",
        chain: user.chain || "",
        authMethod: user.authMethod,
        status: user.status || "Pending",
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      };
    }

    res.json({
      message: "Session refreshed",
      token,
      user: clientPayload(user),
      sessionExpires: user.sessionExpiresAt,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
