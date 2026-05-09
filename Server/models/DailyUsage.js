/**
 * Daily aggregated API usage for reporting.
 */
import mongoose from "mongoose";

const dailyUsageSchema = new mongoose.Schema(
  {
    apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: "ApiKey", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    totalCalls: { type: Number, default: 0 },
  },
  { timestamps: true },
);

dailyUsageSchema.index({ apiKeyId: 1, date: 1 }, { unique: true });

export default mongoose.model("DailyUsage", dailyUsageSchema);

