import mongoose from "mongoose";
import crypto from "crypto";

function computeKeyHash(raw) {
  const pepper = process.env.API_KEY_PEPPER;
  if (pepper) {
    return {
      hashAlg: "hmac-sha256",
      keyHash: crypto.createHmac("sha256", pepper).update(raw).digest("hex"),
    };
  }
  return {
    hashAlg: "sha256",
    keyHash: crypto.createHash("sha256").update(raw).digest("hex"),
  };
}

const apiKeySchema = new mongoose.Schema(
  {
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    hashAlg: { type: String, enum: ["sha256", "hmac-sha256"], default: "sha256" },
    /** Last 4 chars for display */
    mask: { type: String, required: true },
    label: { type: String, default: "" },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** Scopes the key is allowed to use */
    scopes: {
      type: [String],
      default: ["read:balance"],
      enum: [
        "read:balance",
        "read:history",
        "write:tx",
        "admin:users",
        "webhooks:manage",
      ],
    },
    rateLimitRpm: { type: Number, default: 60, min: 1, max: 10_000 },
    environment: { type: String, enum: ["live", "test"], default: "live" },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    /** Associated wallet for wallet-specific API keys */
    walletId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Wallet",
      default: null 
    },
    expiresAt: { type: Date, default: null, index: true },
    rotatedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

apiKeySchema.statics.generate = async function (
  userId,
  label = "",
  scopes = ["read:balance"],
  environment = "live",
  rateLimitRpm = 60,
  expiresAt = null,
  walletId = null
) {
  const prefix = environment === "test" ? "cf_test_" : "cf_live_";
  const raw = `${prefix}${crypto.randomBytes(16).toString("hex")}`;
  const { keyHash, hashAlg } = computeKeyHash(raw);
  const mask = `${prefix}•••••••${raw.slice(-4)}`;
  const doc = await this.create({
    keyHash,
    hashAlg,
    mask,
    userId,
    label,
    scopes,
    environment,
    rateLimitRpm,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    walletId, // Associate with specific wallet
  });
  return { ...doc.toObject(), rawKey: raw };
};

apiKeySchema.methods.isActive = function () {
  if (this.revokedAt) return false;
  if (this.expiresAt && this.expiresAt <= new Date()) return false;
  return true;
};

export default mongoose.model("ApiKey", apiKeySchema);
