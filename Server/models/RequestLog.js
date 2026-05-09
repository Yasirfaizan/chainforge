/**
 * Request logs for analytics (JWT + API key traffic).
 */
import mongoose from "mongoose";

const requestLogSchema = new mongoose.Schema(
  {
    authType: { type: String, enum: ["none", "jwt", "apiKey"], default: "none", index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: "ApiKey", default: null, index: true },

    route: { type: String, required: true, index: true },
    method: { type: String, required: true, index: true },
    statusCode: { type: Number, default: 200, index: true },
    latencyMs: { type: Number, default: 0 },

    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

// Keep logs for 30 days by default
requestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model("RequestLog", requestLogSchema);

