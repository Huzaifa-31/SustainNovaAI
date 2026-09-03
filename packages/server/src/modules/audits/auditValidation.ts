import { z } from "zod";

export const createAuditSchema = z.object({
  organizationId: z.string().min(1, "Organization is required"),
  name: z.string().min(1, "Name is required").max(300),
  description: z.string().max(2000).optional(),
  previousAuditId: z.string().optional(),
  auditPeriod: z
    .object({
      start: z.string().date().optional(),
      end: z.string().date().optional(),
    })
    .optional(),
});

export const updateAuditSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  previousAuditId: z.string().optional(),
  auditPeriod: z
    .object({
      start: z.string().date().optional(),
      end: z.string().date().optional(),
    })
    .optional(),
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
