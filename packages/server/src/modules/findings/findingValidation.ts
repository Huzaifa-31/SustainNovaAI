import { z } from "zod";

export const listFindingsQuerySchema = z.object({
  auditId: z.string().min(1, "auditId is required"),
  severity: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  category: z
    .enum([
      "Labour & HR",
      "Safety",
      "Environment",
      "Governance",
      "Worker Wellbeing",
      "Grievance & Harassment",
      "Wages & Working Hours",
    ])
    .optional(),
  reviewStatus: z.enum(["ai_generated", "needs_review", "approved", "rejected"]).optional(),
  status: z.enum(["Open", "In Progress", "Closed"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const updateFindingSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().min(1).max(5000).optional(),
  category: z
    .enum([
      "Labour & HR",
      "Safety",
      "Environment",
      "Governance",
      "Worker Wellbeing",
      "Grievance & Harassment",
      "Wages & Working Hours",
    ])
    .optional(),
  severity: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  riskReason: z.string().max(2000).optional(),
  recommendedAction: z.string().max(2000).optional(),
  suggestedOwner: z.string().max(200).optional(),
  suggestedDeadline: z.string().max(200).optional(),
  reviewStatus: z.enum(["ai_generated", "needs_review", "approved", "rejected"]).optional(),
  reviewerNotes: z.string().max(2000).optional(),
  status: z.enum(["Open", "In Progress", "Closed"]).optional(),
});

export const findingParamsSchema = z.object({
  id: z.string().min(1, "Finding ID is required"),
});

export type ListFindingsQuery = z.infer<typeof listFindingsQuerySchema>;
export type UpdateFindingInput = z.infer<typeof updateFindingSchema>;
