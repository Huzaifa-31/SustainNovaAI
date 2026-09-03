import { z } from "zod";

export const askQuestionSchema = z.object({
  auditId: z.string().min(1, "auditId is required"),
  question: z.string().min(1, "Question is required").max(2000),
});

export const chatHistoryQuerySchema = z.object({
  auditId: z.string().min(1, "auditId is required"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const clearHistorySchema = z.object({
  auditId: z.string().min(1, "auditId is required"),
});
