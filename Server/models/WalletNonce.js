/**
 * One-time nonce for wallet signature authentication.
 */
import mongoose from "mongoose";

const walletNonceSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, lowercase: true, index: true },
    chain: { type: String, required: true, index: true },
    nonce: { type: String, required: true, index: true },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
    },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

walletNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("WalletNonce", walletNonceSchema);

