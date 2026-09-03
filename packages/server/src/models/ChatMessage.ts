import mongoose, { Schema, Document } from "mongoose";

export interface IChatSource {
  chunkId: string;
  documentId: string;
  pageStart: number;
  pageEnd: number;
  score: number;
  textSnippet: string;
}

export interface IChatMessage extends Document {
  auditId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  sources?: IChatSource[];
  createdAt: Date;
}

const chatSourceSchema = new Schema<IChatSource>(
  {
    chunkId: { type: String, required: true },
    documentId: { type: String, required: true },
    pageStart: { type: Number, required: true },
    pageEnd: { type: Number, required: true },
    score: { type: Number, required: true },
    textSnippet: { type: String, default: "" },
  },
  { _id: false },
);

const chatMessageSchema = new Schema<IChatMessage>(
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
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: { type: String, required: true },
    sources: [chatSourceSchema],
  },
  { timestamps: true },
);

chatMessageSchema.index({ auditId: 1, createdAt: -1 });

export const ChatMessage = mongoose.model<IChatMessage>(
  "ChatMessage",
  chatMessageSchema,
);
