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
router.use("/password", passwordRoutes);
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

// Step 2: Verify login code and complete login
router.post(
  "/login/verify",
  authLimiter,
  validate({ email: "string", code: "string" }),
  async (req, res, next) => {
    try {
      const { email, code } = req.body;

      const user = await User.findOne({ email, role: "client" });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Find verification code
      const verification = await VerificationCode.findOne({
        userId: user._id,
        email,
        type: "login",
        used: false,
      }).sort({ createdAt: -1 });

      if (!verification) {
        return res
          .status(400)
          .json({ error: "No active verification code found" });
      }

      // Check if expired
      if (verification.expiresAt < new Date()) {
        return res.status(400).json({
          error: "Verification code expired",
          expired: true,
        });
      }

      // Verify code
      const hashedInput = VerificationCode.hashCode(code);
      if (hashedInput !== verification.code) {
        await verification.incrementAttempts();

        if (verification.attempts >= 5) {
          return res.status(400).json({
            error: "Too many failed attempts",
            maxAttemptsReached: true,
          });
        }

        return res.status(400).json({
          error: "Invalid verification code",
          attemptsRemaining: 5 - verification.attempts,
        });
      }

      // Mark as used
      await verification.markUsed();

      if (!user.emailVerified) {
        await user.verifyEmail();
      }

      // Refresh session (5-day logout)
      await user.refreshSession();

      // Generate token
      const token = signToken(
        {
          sub: user._id.toString(),
          role: "client",
          email: user.email,
        },
        "30d",
      );

      // Trigger user.login webhook
      webhookService
        .triggerEvent(
          user._id.toString(),
          "user.login",
          webhookService.EventBuilders.userLogin(user, "email", {
            type: "user.login",
            email: user.email,
          }),
        )
        .catch(() => {});

      recordLogin(user._id.toString(), "email", req, {
        email: user.email,
      }).catch(() => {});

      return res.json({
        message: "Login successful",
        token,
        user: clientPayload(user),
        sessionExpires: user.sessionExpiresAt,
      });
    } catch (e) {
      next(e);
    }
  },
);

// ==================== FORGOT PASSWORD ====================

// Step 1: Request password reset
router.post(
  "/forgot-password",
  authLimiter,
  validate({ email: "string" }),
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email, role: "client" });

      // Always return success even if email not found (security)
      if (!user) {
        return res.json({
          message: "If an account exists, a reset code has been sent",
        });
      }

      // Delete old reset codes
      await VerificationCode.deleteMany({
        userId: user._id,
        type: "forgot_password",
      });

      // Generate reset code
      const plainCode = VerificationCode.generateCode();
      const hashedCode = VerificationCode.hashCode(plainCode);

      await VerificationCode.create({
        userId: user._id,
        email,
        code: hashedCode,
        type: "forgot_password",
        ipAddress: req.ip,
      });

      // Send email
      await sendVerificationEmail(email, plainCode, "forgot_password");

      return res.json({
        message: "If an account exists, a reset code has been sent",
        email,
        expiresIn: "10 minutes",
      });
    } catch (e) {
      next(e);
    }
  },
);

// Step 2: Verify reset code
router.post(
  "/forgot-password/verify",
  authLimiter,
  validate({ email: "string", code: "string" }),
  async (req, res, next) => {
    try {
      const { email, code } = req.body;

      const user = await User.findOne({ email, role: "client" });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Find verification code
      const verification = await VerificationCode.findOne({
        userId: user._id,
        email,
        type: "forgot_password",
        used: false,
      }).sort({ createdAt: -1 });

      if (!verification) {
        return res.status(400).json({ error: "No active reset code found" });
      }

      // Check if expired
      if (verification.expiresAt < new Date()) {
        return res.status(400).json({
          error: "Reset code expired",
          expired: true,
        });
      }

      // Verify code
      const hashedInput = VerificationCode.hashCode(code);
      if (hashedInput !== verification.code) {
        return res.status(400).json({ error: "Invalid reset code" });
      }

      // Generate temporary token for password reset
      const resetToken = crypto.randomBytes(32).toString("hex");
      await user.setPasswordResetToken(resetToken);

      return res.json({
        message: "Code verified",
        resetToken,
        expiresIn: "10 minutes",
      });
    } catch (e) {
      next(e);
    }
  },
);

// Step 3: Reset password
router.post(
  "/reset-password",
  authLimiter,
  validate({ email: "string", resetToken: "string", newPassword: "string" }),
  async (req, res, next) => {
    try {
      const { email, resetToken, newPassword } = req.body;

      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters" });
      }

      const user = await User.findOne({ email, role: "client" });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify reset token
      if (!user.isPasswordResetTokenValid(resetToken)) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }

      // Update password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      user.passwordHash = passwordHash;
      await user.clearPasswordResetToken();
      await user.save();

      // Send confirmation email (non-blocking)
      sendPasswordResetConfirmation(email, user.name).catch(console.error);

      return res.json({
        message: "Password reset successful",
      });
    } catch (e) {
      next(e);
    }
  },
);

// ==================== WALLET AUTH (No verification needed) ====================

// Single-call wallet auth compatibility endpoint
// Client calls: POST /api/client/wallet-auth { walletAddress, chain, signature, message }
// Backward compatibility: "address" is also accepted.
// This endpoint verifies the signature and returns JWT in one call.
// The message should be from a recent /api/auth/wallet/nonce call.
router.post(
  "/wallet-auth",
  authLimiter,
  validate({ chain: "string", signature: "string", message: "string" }),
  async (req, res, next) => {
    try {
      const { walletAddress, address, chain, signature, message } = req.body;
      const normalizedChain = String(chain || "")
        .trim()
        .toLowerCase();
      const normalizedAddress = String(walletAddress || address || "").trim();

      if (!normalizedAddress || !normalizedChain) {
        return res
          .status(400)
          .json({ error: "walletAddress (or address) and chain are required" });
      }

      function parseField(msg, label) {
        const rx = new RegExp(`^${label}:\\s*(.+)$`, "mi");
        const m = msg.match(rx);
        return m?.[1]?.trim() || "";
      }

      const msgAddress = String(parseField(message, "Address") || "").trim();
      const msgNonce = String(parseField(message, "Nonce") || "").trim();
      if (!msgAddress || !msgNonce) {
        return res
          .status(400)
          .json({
            error: "Invalid message format - must include Address and Nonce",
          });
      }

      const nonceDoc = await WalletNonce.findOne({
        address: msgAddress.toLowerCase(),
        chain: normalizedChain,
        nonce: msgNonce,
        usedAt: null,
      }).sort({ createdAt: -1 });

      if (!nonceDoc) {
        return res
          .status(401)
          .json({ error: "Nonce not found or already used" });
      }
      if (nonceDoc.expiresAt < new Date()) {
        return res
          .status(401)
          .json({ error: "Nonce expired - please request a new one" });
      }

      let recoveredAddress = "";
      if (normalizedChain === "solana") {
        const nacl = await import("tweetnacl");
        const bs58 = await import("bs58");
        try {
          const pubKeyBytes = bs58.default.decode(msgAddress);
          const sigBytes = bs58.default.decode(String(signature).trim());
          const msgBytes = new TextEncoder().encode(String(message));
          const ok = nacl.default.sign.detached.verify(
            msgBytes,
            sigBytes,
            pubKeyBytes,
          );
          if (!ok) {
            return res.status(401).json({ error: "Invalid Solana signature" });
          }
          recoveredAddress = msgAddress;
        } catch {
          return res
            .status(401)
            .json({ error: "Solana signature verification failed" });
        }
      } else if (normalizedChain === "cosmos") {
        if (!String(signature).match(/^[A-Za-z0-9+/]+={0,2}$/)) {
          return res
            .status(400)
            .json({ error: "Invalid Cosmos signature format" });
        }
        if (!String(msgAddress).startsWith("cosmos")) {
          return res
            .status(400)
            .json({ error: "Invalid Cosmos address format" });
        }
        recoveredAddress = msgAddress;
      } else {
        try {
          const { verifyMessage } = await import("ethers");
          recoveredAddress = String(
            verifyMessage(String(message), String(signature)),
          ).toLowerCase();
          if (recoveredAddress !== String(msgAddress).toLowerCase()) {
            return res
              .status(401)
              .json({ error: "Signature does not match address" });
          }
        } catch {
          return res
            .status(401)
            .json({ error: "EVM signature verification failed" });
        }
      }

      nonceDoc.usedAt = new Date();
      await nonceDoc.save();

      let authenticatedUser = null;
      const header = req.headers.authorization || "";
      if (header.startsWith("Bearer ")) {
        try {
          const decoded = verifyToken(header.slice(7));
          if (decoded?.role === "client" && decoded?.sub) {
            authenticatedUser = await User.findById(decoded.sub);
          }
        } catch {
          authenticatedUser = null;
        }
      }

      let user = await User.findOne({
        role: "client",
        $or: [
          { walletAddress: recoveredAddress, chain: normalizedChain },
          {
            "wallets.address": recoveredAddress,
            "wallets.chain": normalizedChain,
          },
        ],
      });

      if (
        authenticatedUser &&
        user &&
        authenticatedUser._id.toString() !== user._id.toString()
      ) {
        return res
          .status(409)
          .json({ error: "This wallet is already linked to another account" });
      }

      let isNewUser = false;
      let mergedWallet = false;
      if (!user && authenticatedUser) {
        const walletType = normalizedChain === "solana" ? "solana" : "evm";
        const alreadyLinked =
          authenticatedUser.wallets.some(
            (w) =>
              w.address.toLowerCase() === recoveredAddress.toLowerCase() &&
              w.chain === normalizedChain,
          ) ||
          (authenticatedUser.walletAddress &&
            authenticatedUser.walletAddress.toLowerCase() ===
              recoveredAddress.toLowerCase() &&
            authenticatedUser.chain === normalizedChain);

        if (!alreadyLinked) {
          await authenticatedUser.addWallet({
            address: recoveredAddress,
            chain: normalizedChain,
            type: walletType,
            label: `${normalizedChain} wallet`,
          });
        }

        if (
          !authenticatedUser.authMethod ||
          authenticatedUser.authMethod === "email"
        ) {
          authenticatedUser.authMethod = "wallet";
          await authenticatedUser.save();
        }

        user = authenticatedUser;
        mergedWallet = true;
      }

      if (!user) {
        user = await User.create({
          walletAddress: recoveredAddress,
          chain: normalizedChain,
          role: "client",
          authMethod: "wallet",
          status: "Active",
          emailVerified: true,
        });
        isNewUser = true;
      }

      if (user.status === "Suspended") {
        return res
          .status(403)
          .json({ error: "Account suspended - contact support" });
      }

      if (isNewUser) {
        webhookService
          .triggerEvent(
            user._id.toString(),
            "user.created",
            webhookService.EventBuilders.userCreated(user),
          )
          .catch(() => {});
      }

      await user.refreshSession();

      const token = signToken(
        {
          sub: user._id.toString(),
          role: "client",
          walletAddress: recoveredAddress,
          chain: normalizedChain,
        },
        "5d",
      );

      webhookService
        .triggerEvent(
          user._id.toString(),
          "user.login",
          {
            type: "user.login",
            walletAddress: recoveredAddress,
            chain: normalizedChain,
          },
          { chain: normalizedChain, walletAddress: recoveredAddress },
        )
        .catch(() => {});

      recordLogin(user._id.toString(), "wallet", req, {
        chain: normalizedChain,
        walletAddress: recoveredAddress,
        mergedWallet,
      }).catch(() => {});

      return res.json({
        token,
        user: {
          id: user._id.toString(),
          email: user.email || "",
          name: user.name || "",
          role: "client",
          walletAddress: user.walletAddress || recoveredAddress,
          chain: user.chain || normalizedChain,
          authMethod: "wallet",
          status: user.status || "Active",
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

// ==================== LOGIN HISTORY ====================

router.get("/login-history", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const method = req.query.method ? String(req.query.method) : "";

    const filter = { userId: req.user.sub };
    if (method) filter.method = method;

    const [rows, total] = await Promise.all([
      LoginHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      LoginHistory.countDocuments(filter),
    ]);

    return res.json({ rows, total, limit, offset });
  } catch (e) {
    next(e);
  }
});

// ==================== SESSION CHECK ====================

router.get("/session/check", requireAuth, async (req, res, next) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isValid = user.isSessionValid();
    const expiresIn = user.sessionExpiresAt
      ? Math.floor((user.sessionExpiresAt - new Date()) / 1000)
      : 0;

    return res.json({
      valid: isValid,
      expiresIn,
      expiresAt: user.sessionExpiresAt,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
