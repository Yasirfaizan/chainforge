import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ["email", "wallet", "google", "github", "admin"],
      required: true,
      index: true,
    },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

loginHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("LoginHistory", loginHistorySchema);
