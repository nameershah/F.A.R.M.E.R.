import mongoose, { Schema, type InferSchemaType } from "mongoose";

// ==========================================
// SECURITY AUDIT: METADATA LOG SCHEMA (CONFIDENTIALITY)
// ==========================================
// To safeguard smallholder farmer privacy and confidentiality, this schema
// stores only minimal aggregated metrics metadata. It explicitly avoids storing
// full raw answers, reasoning trace lists, or binary images.
const queryLogSchema = new Schema(
  {
    queryText: { type: String, default: "" },
    hadImage: { type: Boolean, default: false },
    intent: { type: String, required: true },
    escalated: { type: Boolean, required: true },
    confidence: { type: Number },
    answerPreview: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export type QueryLogDocument = InferSchemaType<typeof queryLogSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const QueryLog =
  mongoose.models.QueryLog ??
  mongoose.model("QueryLog", queryLogSchema);
