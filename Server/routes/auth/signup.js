import express from "express";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import VerificationCode from "../../models/VerificationCode.js";
import { signToken } from "../../util/jwt.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import { validate, sanitize } from "../../middleware/validate.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
} from "../../services/emailService.js";
import webhookService from "../../services/webhookService.js";

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

// Step 1: Initiate signup - create pending user and send verification code
router.post(
  "/initiate",
  authLimiter,
  sanitize("email", "name"),
  validate({ email: "string", password: "string" }),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      if (password.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters" });
      }

      // Check if email already exists and is verified
      const existing = await User.findOne({ email });
      if (existing && existing.emailVerified) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // If user exists but not verified, delete old record
      if (existing && !existing.emailVerified) {
        await User.deleteOne({ _id: existing._id });
        await VerificationCode.deleteMany({ userId: existing._id });
      }

      // Create pending user
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: "client",
        authMethod: "email",
        status: "Pending",
        emailVerified: false,
        wallets: [],
        nextWalletNumber: 1,
      });

      // Generate and save verification code
      const plainCode = VerificationCode.generateCode();
      const hashedCode = VerificationCode.hashCode(plainCode);

      await VerificationCode.create({
        userId: user._id,
        email,
        code: hashedCode,
        type: "signup",
        ipAddress: req.ip,
      });

      // Send verification email
      await sendVerificationEmail(email, plainCode, "signup");

      return res.status(201).json({
        message: "Verification code sent to your email",
        email,
        expiresIn: "10 minutes",
        userId: user._id.toString(),
      });
    } catch (e) {
      next(e);
    }
  },
);

// Step 2: Verify email and complete signup
router.post(
  "/verify",
  authLimiter,
  validate({ email: "string", code: "string" }),
  async (req, res, next) => {
    try {
      const { email, code } = req.body;

      // Find user
      const user = await User.findOne({ email, role: "client" });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      // Find verification code
      const verification = await VerificationCode.findOne({
        userId: user._id,
        email,
        type: "signup",
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
          message: "Please request a new code",
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

      // Mark as verified
      await verification.markUsed();
      await user.verifyEmail();

      // Send welcome email (non-blocking)
      sendWelcomeEmail(email, user.name).catch(console.error);

      // Trigger user.created webhook if this is their first sign-up
      webhookService
        .triggerEvent(
          user._id.toString(),
          "user.created",
          webhookService.EventBuilders.userCreated(user),
        )
        .catch(() => {});

      // Generate token and log in user
      await user.refreshSession();

      const token = signToken(
        {
          sub: user._id.toString(),
          role: "client",
          email: user.email,
        },
        "30d",
      );

      return res.json({
        message: "Email verified successfully",
        token,
        user: clientPayload(user),
      });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
