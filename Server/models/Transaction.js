import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true, index: true },
    chain: { type: String, required: true, index: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    amount: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Failed"],
      default: "Pending",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    blockNumber: { type: Number, default: null },
    gasUsed: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Fast lookups for user analytics and de-duplication for sync upserts.
transactionSchema.index({ userId: 1, chain: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, chain: 1, hash: 1 }, { unique: true });

export default mongoose.model("Transaction", transactionSchema);
