import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../../models/User.js";
import VerificationCode from "../../models/VerificationCode.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import { validate } from "../../middleware/validate.js";
import { sendVerificationEmail, sendPasswordResetConfirmation } from "../../services/emailService.js";

const router = express.Router();

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

export default router;
