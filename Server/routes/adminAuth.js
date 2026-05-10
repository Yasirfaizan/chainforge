import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import AdminCode from "../models/AdminCode.js";
import AuditLog from "../models/AuditLog.js";
import VerificationCode from "../models/VerificationCode.js";
import { signToken } from "../util/jwt.js";
import { adminLoginLimiter, authLimiter } from "../middleware/rateLimiter.js";
import { validate, sanitize } from "../middleware/validate.js";
import { sendVerificationEmail } from "../services/emailService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import QRCode from "qrcode";
import { authenticator } from "@otplib/preset-default";

// Configure TOTP to use 6 digits
authenticator.options = {
  digits: 6,
  algorithm: 'sha1',
  step: 30
};

const router = express.Router();

function adminPayload(user) {
  return {
    id: user._id.toString(),
    email: user.email || "",
    name: user.name || "",
    role: "admin",
    createdAt: user.createdAt,
  };
}

/**
 * Admin Login — Step 1: verify password and send email OTP.
 */
router.post(
  "/login/initiate",
  adminLoginLimiter,
  sanitize("email"),
  validate({ email: "string", password: "string" }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email, role: "admin" });

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      if (user.status === "Suspended") {
        return res
          .status(403)
          .json({ error: "Account suspended — contact support" });
      }

      const emailNotVerified = !user.emailVerified;

      await VerificationCode.deleteMany({
        userId: user._id,
        type: "admin_login",
      });
      const plainCode = VerificationCode.generateCode();
      const hashedCode = VerificationCode.hashCode(plainCode);

      await VerificationCode.create({
        userId: user._id,
        email,
        code: hashedCode,
        type: "admin_login",
        ipAddress: req.ip,
      });

      await sendVerificationEmail(email, plainCode, "admin_login");

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

/**
 * Admin Login — Step 2: verify email OTP and issue token.
 */
router.post(
  "/login/verify",
  adminLoginLimiter,
  validate({ email: "string" }),
  async (req, res, next) => {
    try {
      const { email, code, totpCode } = req.body;
      
      // Custom validation: require either code or totpCode
      if (!code && !totpCode) {
        return res.status(400).json({ error: "Either verification code or TOTP code is required" });
      }
      
      const user = await User.findOne({ email, role: "admin" });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const verification = await VerificationCode.findOne({
        userId: user._id,
        email,
        type: "admin_login",
        used: false,
      }).sort({ createdAt: -1 });

      if (!verification) {
        return res
          .status(400)
          .json({ error: "No active verification code found" });
      }

      if (verification.expiresAt < new Date()) {
        return res
          .status(400)
          .json({ error: "Verification code expired", expired: true });
      }

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

      // Check if user has TOTP enabled
      if (user.adminTotpEnabled) {
        if (!totpCode) {
          return res.status(400).json({
            error: "2FA enabled",
            requiresTOTP: true,
            message: "Enter your 6-digit authenticator code",
          });
        }

        const verified = authenticator.check(totpCode, user.adminTotpSecret);
        if (!verified) {
          return res
            .status(401)
            .json({ error: "Invalid TOTP code", requiresTOTP: true });
        }
      }

      await verification.markUsed();

      if (!user.emailVerified) {
        await user.verifyEmail();
      }

      await user.refreshSession();

      const token = signToken(
        {
          sub: user._id.toString(),
          role: "admin",
          email: user.email,
        },
        "30d",
      );
      await AuditLog.create({
        adminId: user._id,
        action: "admin.login",
        targetType: "admin",
        targetId: user._id.toString(),
        ip: req.ip,
        userAgent: req.get("user-agent") || "",
      });

      return res.json({ token, user: adminPayload(user) });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * Admin Signup — Step 1: validate admin code and send email OTP.
 */
router.post(
  "/signup/initiate",
  authLimiter,
  sanitize("email", "name"),
  validate({
    name: "string",
    email: "string",
    password: "string",
    adminCode: "string",
  }),
  async (req, res, next) => {
    try {
      const { name, email, password, adminCode } = req.body;

      if (password.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters" });
      }

      const codeDoc = await AdminCode.findOne({ code: adminCode.trim() });
      if (!codeDoc) {
        return res.status(403).json({ error: "Invalid admin code" });
      }
      if (codeDoc.used) {
        return res
          .status(403)
          .json({ error: "This admin code has already been used" });
      }

      const existing = await User.findOne({ email });
      if (existing && existing.emailVerified) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (existing && !existing.emailVerified) {
        // Restore any admin code that was marked as used by this pending user
        await AdminCode.updateMany(
          { usedBy: existing._id },
          { used: false, usedBy: null, usedAt: null }
        );
        await User.deleteOne({ _id: existing._id });
        await VerificationCode.deleteMany({ userId: existing._id });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: "admin",
        authMethod: "email",
        status: "Pending",
        emailVerified: false,
      });

      const plainCode = VerificationCode.generateCode();
      const hashedCode = VerificationCode.hashCode(plainCode);

      await VerificationCode.create({
        userId: user._id,
        email,
        code: hashedCode,
        type: "admin_signup",
        ipAddress: req.ip,
      });

      codeDoc.used = true;
      codeDoc.usedBy = user._id;
      codeDoc.usedAt = new Date();
      await codeDoc.save();

      await sendVerificationEmail(email, plainCode, "admin_signup");

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

/**
 * Admin Signup — Step 2: verify email OTP and activate account.
 */
router.post(
  "/signup/verify",
  authLimiter,
  validate({ email: "string", code: "string" }),
  async (req, res, next) => {
    try {
      const { email, code } = req.body;
      const user = await User.findOne({ email, role: "admin" });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      const verification = await VerificationCode.findOne({
        userId: user._id,
        email,
        type: "admin_signup",
        used: false,
      }).sort({ createdAt: -1 });

      if (!verification) {
        return res
          .status(400)
          .json({ error: "No active verification code found" });
      }

      if (verification.expiresAt < new Date()) {
        return res
          .status(400)
          .json({ error: "Verification code expired", expired: true });
      }

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

      await verification.markUsed();
      await user.verifyEmail();
      await user.refreshSession();

      const token = signToken(
        {
          sub: user._id.toString(),
          role: "admin",
          email: user.email,
        },
        "30d",
      );
      await AuditLog.create({
        adminId: user._id,
        action: "admin.signup",
        targetType: "admin",
        targetId: user._id.toString(),
        ip: req.ip,
        userAgent: req.get("user-agent") || "",
      });

      return res.status(201).json({ token, user: adminPayload(user) });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * POST /api/admin/2fa/setup
 * Generate TOTP secret and QR code for admin 2FA setup
 */
router.post("/2fa/setup", requireAuth, async (req, res, next) => {
  try {
    // Verify user is admin
    const user = await User.findById(req.user.sub);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can enable 2FA" });
    }

    // Generate new TOTP secret
    const secret = authenticator.generateSecret();

    // Create TOTP URI for QR code
    const totpUri = authenticator.keyuri(
      user.email,
      "ChainForge Admin",
      secret,
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(totpUri);

    res.json({
      message: "TOTP setup started",
      qrCode,
      secret, // Return secret in case user wants to save manually
      instructions:
        "Scan the QR code with an authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.) and enter the 6-digit code to confirm setup",
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/2fa/enable
 * Enable TOTP 2FA with verification code
 */
router.post(
  "/2fa/enable",
  requireAuth,
  validate({ secret: "string", code: "string" }),
  async (req, res, next) => {
    try {
      const { secret, code } = req.body;

      // Verify user is admin
      const user = await User.findById(req.user.sub);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can enable 2FA" });
      }

      const verified = authenticator.check(code, secret);
      if (!verified) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }

      // Enable TOTP
      user.adminTotpSecret = secret;
      user.adminTotpEnabled = true;
      await user.save();

      await AuditLog.create({
        adminId: user._id,
        action: "admin.2fa_enabled",
        targetType: "admin",
        targetId: user._id.toString(),
        ip: req.ip,
        userAgent: req.get("user-agent") || "",
      });

      res.json({
        message: "TOTP 2FA enabled successfully",
      });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * POST /api/admin/2fa/disable
 * Disable TOTP 2FA (requires verification code)
 */
router.post(
  "/2fa/disable",
  requireAuth,
  validate({ code: "string" }),
  async (req, res, next) => {
    try {
      const { code } = req.body;

      // Verify user is admin
      const user = await User.findById(req.user.sub);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can disable 2FA" });
      }

      if (!user.adminTotpEnabled) {
        return res.status(400).json({ error: "2FA not enabled" });
      }

      const verified = authenticator.check(code, user.adminTotpSecret);
      if (!verified) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }

      // Disable TOTP
      user.adminTotpSecret = "";
      user.adminTotpEnabled = false;
      await user.save();

      await AuditLog.create({
        adminId: user._id,
        action: "admin.2fa_disabled",
        targetType: "admin",
        targetId: user._id.toString(),
        ip: req.ip,
        userAgent: req.get("user-agent") || "",
      });

      res.json({
        message: "TOTP 2FA disabled successfully",
      });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * GET /api/admin/2fa/status
 * Check if admin has 2FA enabled
 */
router.get("/2fa/status", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can check 2FA status" });
    }

    res.json({
      enabled: user.adminTotpEnabled,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
