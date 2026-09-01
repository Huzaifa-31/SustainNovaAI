import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export type DocumentStatus =
  | "uploaded"
  | "queued"
  | "parsing"
  | "chunking"
  | "embedding"
  | "extracting"
  | "completed"
  | "failed";

export interface IDocument extends MongooseDocument {
  auditId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  status: DocumentStatus;
  errorMessage?: string;
  checksum?: string;
  pageCount: number;
  pagesProcessed: number;
  metadata: {
    title?: string;
    author?: string;
    language?: string;
  };
  qualityReport: {
    totalPages: number;
    processedPages: number;
    ocrRequired: boolean;
    ocrPages: number[];
    unreadablePages: number[];
    summary: string;
  };
  processing: {
    chunksGenerated: number;
    embeddingsGenerated: number;
    startedAt?: Date;
    completedAt?: Date;
  };
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    auditId: {
      type: Schema.Types.ObjectId,
      ref: "Audit",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storagePath: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "uploaded",
        "queued",
        "parsing",
        "chunking",
        "embedding",
        "extracting",
        "completed",
        "failed",
      ],
      default: "uploaded",
      index: true,
    },
    errorMessage: { type: String },
    checksum: { type: String },
    pageCount: { type: Number, default: 0 },
    pagesProcessed: { type: Number, default: 0 },
    metadata: {
      title: { type: String },
      author: { type: String },
      language: { type: String },
    },
    qualityReport: {
      totalPages: { type: Number, default: 0 },
      processedPages: { type: Number, default: 0 },
      ocrRequired: { type: Boolean, default: false },
      ocrPages: [{ type: Number }],
      unreadablePages: [{ type: Number }],
      summary: { type: String, default: "" },
    },
    processing: {
      chunksGenerated: { type: Number, default: 0 },
      embeddingsGenerated: { type: Number, default: 0 },
      startedAt: { type: Date },
      completedAt: { type: Date },
    },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

// Compound index for efficient queries
documentSchema.index({ auditId: 1, createdAt: -1 });

export const DocumentModel = mongoose.model<IDocument>("Document", documentSchema);
