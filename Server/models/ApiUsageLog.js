/**
 * Per-request API usage logs for API key traffic.
 */
import mongoose from "mongoose";

const apiUsageLogSchema = new mongoose.Schema(
  {
    apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: "ApiKey", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    route: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, default: 200 },
    latencyMs: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("ApiUsageLog", apiUsageLogSchema);

