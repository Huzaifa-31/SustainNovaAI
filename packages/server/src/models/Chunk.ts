import mongoose, { Schema, Document } from "mongoose";

export interface IChunk extends Document {
  documentId: mongoose.Types.ObjectId;
  auditId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  chunkIndex: number;
  text: string;
  pageStart: number;
  pageEnd: number;
  sectionTitle?: string;
  embedding?: number[]; // 1536 dims — populated in Phase 6
  tokenCount: number;
  createdAt: Date;
}

const chunkSchema = new Schema<IChunk>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
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
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    pageStart: { type: Number, required: true },
    pageEnd: { type: Number, required: true },
    sectionTitle: { type: String },
    embedding: { type: [Number], default: undefined }, // Populated in Phase 6
    tokenCount: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Compound indexes for efficient queries
chunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });
chunkSchema.index({ auditId: 1, documentId: 1 });

export const Chunk = mongoose.model<IChunk>("Chunk", chunkSchema);
