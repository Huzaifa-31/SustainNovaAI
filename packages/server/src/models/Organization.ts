import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  description?: string;
  ownerUserId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  settings: {
    riskWeights: { critical: number; high: number; medium: number; low: number };
  };
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    settings: {
      riskWeights: {
        critical: { type: Number, default: 4 },
        high: { type: Number, default: 3 },
        medium: { type: Number, default: 2 },
        low: { type: Number, default: 1 },
      },
    },
  },
  { timestamps: true },
);

organizationSchema.index({ ownerUserId: 1 });
organizationSchema.index({ memberIds: 1 });

export const Organization = mongoose.model<IOrganization>("Organization", organizationSchema);
