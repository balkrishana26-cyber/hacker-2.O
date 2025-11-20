import mongoose from "mongoose"

const AptitudeResultSchema = new mongoose.Schema(
  {
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    score: { type: Number, required: true },
    batch: { type: String, required: true },
    violation: { type: String },
    answers: { type: Array, default: [] },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
)

export const AptitudeResult = (mongoose.models?.AptitudeResult as mongoose.Model<any>) || mongoose.model("AptitudeResult", AptitudeResultSchema)

export default AptitudeResult
