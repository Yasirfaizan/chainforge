import express from "express";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import VerificationCode from "../../models/VerificationCode.js";
import { signToken } from "../../util/jwt.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import { validate, sanitize } from "../../middleware/validate.js";
import { sendVerificationEmail } from "../../services/emailService.js";
import webhookService from "../../services/webhookService.js";
import { recordLogin } from "../../services/loginHistoryService.js";

const router = express.Router();

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

// Resend verification code
router.post(
  "/resend",
  authLimiter,
  validate({ email: "string" }),
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email, role: "client" });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      // Delete old codes
      await VerificationCode.deleteMany({ userId: user._id, type: "signup" });

      // Generate new code
      const plainCode = VerificationCode.generateCode();
      const hashedCode = VerificationCode.hashCode(plainCode);

      await VerificationCode.create({
        userId: user._id,
        email,
        code: hashedCode,
        type: "signup",
        ipAddress: req.ip,
      });

      // Send email
      await sendVerificationEmail(email, plainCode, "signup");

      return res.json({
        message: "New verification code sent",
        email,
        expiresIn: "10 minutes",
      });
    } catch (e) {
      next(e);
    }
  },
);

// Step 1: Initiate login - verify password and send code
router.post(
  "/initiate",
  authLimiter,
  sanitize("email"),
  validate({ email: "string", password: "string" }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email, role: "client" });

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.status === "Suspended") {
        return res
          .status(403)
          .json({ error: "Account suspended — contact support" });
      }

      // Check password
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      const emailNotVerified = !user.emailVerified;

      // Delete old login codes
      await VerificationCode.deleteMany({ userId: user._id, type: "login" });

      // Generate verification code
      const plainCode = VerificationCode.generateCode();
      const hashedCode = VerificationCode.hashCode(plainCode);

      await VerificationCode.create({
        userId: user._id,
        email,
        code: hashedCode,
        type: "login",
        ipAddress: req.ip,
      });

      // Send verification email
      await sendVerificationEmail(email, plainCode, "login");

      return res.json({
        message: "Verification code sent to your email",
        email,
        expiresIn: "10 minutes",
        userId: user._id.toString(),
        requiresVerification: true,
        emailNotVerified,
      });
    } catch (e) {
      next(e);
    }
  },
);

// Step 2: Verify login code and complete login
router.post(
  "/verify",
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

      // Record login for security monitoring
      await recordLogin(user._id, req.ip, req.get('User-Agent'), 'email');

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

      return res.json({
        message: "Login successful",
        token,
        user: clientPayload(user),
      });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
