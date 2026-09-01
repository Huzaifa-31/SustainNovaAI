import mongoose, { Schema, Document } from "mongoose";

export interface IAudit extends Document {
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: "active" | "completed" | "archived";
  auditPeriod?: { start: Date; end: Date };
  riskScore: number;
  findingCounts: { critical: number; high: number; medium: number; low: number; total: number };
  capStatus: { open: number; inProgress: number; closed: number; overdue: number };
  previousAuditId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const auditSchema = new Schema<IAudit>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ["active", "completed", "archived"], default: "active" },
    auditPeriod: {
      start: { type: Date },
      end: { type: Date },
    },
    riskScore: { type: Number, default: 0, min: 0, max: 4 },
    findingCounts: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    capStatus: {
      open: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 },
      closed: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
    },
    previousAuditId: { type: Schema.Types.ObjectId, ref: "Audit" },
  },
  { timestamps: true },
);

auditSchema.index({ organizationId: 1, status: 1 });
auditSchema.index({ createdBy: 1 });

export const Audit = mongoose.model<IAudit>("Audit", auditSchema);
