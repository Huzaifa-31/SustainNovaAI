import mongoose, { Schema, Document } from "mongoose";

export type CAPStatus =
  | "draft"
  | "approved"
  | "assigned"
  | "in_progress"
  | "evidence_submitted"
  | "review"
  | "closed";

export type FindingSeverity = "Critical" | "High" | "Medium" | "Low";

export interface ICAPComment {
  userId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ICAP extends Document {
  findingId: mongoose.Types.ObjectId;
  auditId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  rootCause: string;
  correctiveAction: string;
  expectedOutcome: string;
  priority: FindingSeverity;
  responsibleRole: string;
  suggestedTimeline: string;
  status: CAPStatus;
  humanApproved: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  dueDate?: string;
  progress?: string;
  comments: ICAPComment[];
  completionEvidence?: string;
  completionEvidencePath?: string;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  isOverdue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<ICAPComment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const capSchema = new Schema<ICAP>(
  {
    findingId: {
      type: Schema.Types.ObjectId,
      ref: "Finding",
      required: true,
      index: true,
    },
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
    rootCause: { type: String, required: true },
    correctiveAction: { type: String, required: true },
    expectedOutcome: { type: String, required: true },
    priority: {
      type: String,
      required: true,
      enum: ["Critical", "High", "Medium", "Low"],
    },
    responsibleRole: { type: String, required: true },
    suggestedTimeline: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: [
        "draft",
        "approved",
        "assigned",
        "in_progress",
        "evidence_submitted",
        "review",
        "closed",
      ],
      default: "draft",
      index: true,
    },
    humanApproved: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
    dueDate: { type: String },
    progress: { type: String, default: "" },
    comments: [commentSchema],
    completionEvidence: { type: String },
    completionEvidencePath: { type: String },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isOverdue: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Compound indexes for efficient queries
capSchema.index({ auditId: 1, status: 1 });
capSchema.index({ findingId: 1 }, { unique: true });

export const CAP = mongoose.model<ICAP>("CAP", capSchema);
