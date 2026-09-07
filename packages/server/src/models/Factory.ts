import mongoose, { Schema, Document } from "mongoose";

export interface IFactory extends Document {
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const factorySchema = new Schema<IFactory>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    location: { type: String },
  },
  { timestamps: true },
);

factorySchema.index({ organizationId: 1, name: 1 });

export const Factory = mongoose.model<IFactory>("Factory", factorySchema);
