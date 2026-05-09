import mongoose from "mongoose";

const adminCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    used: { type: Boolean, default: false },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("AdminCode", adminCodeSchema);
