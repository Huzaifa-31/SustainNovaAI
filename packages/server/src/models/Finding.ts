import mongoose, { Schema, Document } from "mongoose";

export type FindingSeverity = "Critical" | "High" | "Medium" | "Low";
export type FindingCategory =
  | "Labour & HR"
  | "Safety"
  | "Environment"
  | "Governance"
  | "Worker Wellbeing"
  | "Grievance & Harassment"
  | "Wages & Working Hours";
export type ReviewStatus =
  | "ai_generated"
  | "needs_review"
  | "approved"
  | "rejected";
export type ConfidenceSignal =
  | "strong_evidence"
  | "limited_evidence"
  | "needs_review"
  | "evidence_not_found";

export const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export interface IFinding extends Document {
  auditId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  documentId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: FindingCategory;
  severity: FindingSeverity;
  severityWeight: number;
  riskReason: string;
  evidenceText: string;
  sourcePage?: number;
  sourceSection?: string;
  recommendedAction: string;
  suggestedOwner?: string;
  suggestedDeadline?: string;
  reviewStatus: ReviewStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewerNotes?: string;
  editedFields: string[];
  possibleDuplicateIds: mongoose.Types.ObjectId[];
  duplicateResolved: boolean;
  duplicateMergedInto?: mongoose.Types.ObjectId;
  confidenceSignal: ConfidenceSignal;
  status: "Open" | "In Progress" | "Closed";
  createdAt: Date;
  updatedAt: Date;
}

const findingSchema = new Schema<IFinding>(
  {
    auditId: {
      type: Schema.Types.ObjectId,
      ref: "Audit",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        "Labour & HR",
        "Safety",
        "Environment",
        "Governance",
        "Worker Wellbeing",
        "Grievance & Harassment",
        "Wages & Working Hours",
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ["Critical", "High", "Medium", "Low"],
    },
    severityWeight: { type: Number, required: true },
    riskReason: { type: String, required: true },
    evidenceText: { type: String, required: true },
    sourcePage: { type: Number },
    sourceSection: { type: String },
    recommendedAction: { type: String, required: true },
    suggestedOwner: { type: String },
    suggestedDeadline: { type: String },
    reviewStatus: {
      type: String,
      required: true,
      enum: ["ai_generated", "needs_review", "approved", "rejected"],
      default: "ai_generated",
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewerNotes: { type: String },
    editedFields: [{ type: String }],
    possibleDuplicateIds: [{ type: Schema.Types.ObjectId, ref: "Finding" }],
    duplicateResolved: { type: Boolean, default: false },
    duplicateMergedInto: { type: Schema.Types.ObjectId, ref: "Finding" },
    confidenceSignal: {
      type: String,
      required: true,
      enum: [
        "strong_evidence",
        "limited_evidence",
        "needs_review",
        "evidence_not_found",
      ],
      default: "needs_review",
    },
    status: {
      type: String,
      required: true,
      enum: ["Open", "In Progress", "Closed"],
      default: "Open",
    },
  },
  { timestamps: true },
);

// Compound indexes for efficient filtering
findingSchema.index({ auditId: 1, severity: 1 });
findingSchema.index({ auditId: 1, category: 1 });
findingSchema.index({ auditId: 1, status: 1 });
findingSchema.index({ auditId: 1, reviewStatus: 1 });

export const Finding = mongoose.model<IFinding>("Finding", findingSchema);
