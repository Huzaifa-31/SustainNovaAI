import { z } from "zod";

export const uploadDocumentSchema = z.object({
  auditId: z.string().min(1, "auditId is required"),
});

export const getDocumentParamsSchema = z.object({
  id: z.string().min(1, "Document ID is required"),
});

export const listDocumentsQuerySchema = z.object({
  auditId: z.string().optional(),
  status: z.enum(["uploaded", "queued", "parsing", "chunking", "embedding", "extracting", "completed", "failed"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const retryDocumentSchema = z.object({
  id: z.string().min(1, "Document ID is required"),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type GetDocumentParams = z.infer<typeof getDocumentParamsSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
