import mongoose from "mongoose";
import crypto from "crypto";

const verificationCodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    
    // 6-digit verification code
    code: {
      type: String,
      required: true
    },
    
    // Code type: 'signup', 'login', 'forgot_password', 'admin_signup', 'admin_login'
    type: {
      type: String,
      enum: ["signup", "login", "forgot_password", "admin_signup", "admin_login"],
      required: true
    },
    
    // Expires in 10 minutes
    expiresAt: {
      type: Date,
      required: true,
      default: function() {
        return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      }
    },
    
    // Track if code has been used
    used: {
      type: Boolean,
      default: false
    },
    
    // Track verification attempts
    attempts: {
      type: Number,
      default: 0,
      max: 5 // Max 5 attempts
    },
    
    // IP address for security
    ipAddress: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// Index for auto-expiration
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate random 6-digit code securely
verificationCodeSchema.statics.generateCode = function() {
  return crypto.randomInt(100000, 1000000).toString();
};

// Hash code for storage (security)
verificationCodeSchema.statics.hashCode = function(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
};

// Verify code
verificationCodeSchema.methods.verifyCode = function(inputCode) {
  const hashedInput = crypto.createHash('sha256').update(inputCode).digest('hex');
  return hashedInput === this.code && !this.used && this.attempts < 5;
};

// Increment attempts
verificationCodeSchema.methods.incrementAttempts = async function() {
  this.attempts += 1;
  return await this.save();
};

// Mark as used
verificationCodeSchema.methods.markUsed = async function() {
  this.used = true;
  return await this.save();
};

export default mongoose.model("VerificationCode", verificationCodeSchema);
