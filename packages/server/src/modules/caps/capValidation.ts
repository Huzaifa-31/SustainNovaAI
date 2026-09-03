import { z } from "zod";

export const listCapsQuerySchema = z.object({
  auditId: z.string().min(1, "auditId is required"),
  status: z
    .enum([
      "draft",
      "approved",
      "assigned",
      "in_progress",
      "evidence_submitted",
      "review",
      "closed",
    ])
    .optional(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const generateCapsSchema = z.object({
  auditId: z.string().min(1, "auditId is required"),
});

export const updateCapSchema = z.object({
  rootCause: z.string().min(1).max(2000).optional(),
  correctiveAction: z.string().min(1).max(5000).optional(),
  expectedOutcome: z.string().min(1).max(2000).optional(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  responsibleRole: z.string().min(1).max(200).optional(),
  suggestedTimeline: z.string().min(1).max(200).optional(),
  status: z
    .enum([
      "draft",
      "approved",
      "assigned",
      "in_progress",
      "evidence_submitted",
      "review",
      "closed",
    ])
    .optional(),
  dueDate: z.string().max(200).optional(),
  progress: z.string().max(2000).optional(),
  completionEvidence: z.string().max(5000).optional(),
});

export const capParamsSchema = z.object({
  id: z.string().min(1, "CAP ID is required"),
});

export const addCommentSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const approveCapSchema = z.object({
  approved: z.boolean(),
});

export type ListCapsQuery = z.infer<typeof listCapsQuerySchema>;
export type GenerateCapsInput = z.infer<typeof generateCapsSchema>;
export type UpdateCapInput = z.infer<typeof updateCapSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
