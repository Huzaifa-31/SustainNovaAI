import { z } from "zod";

export const exportQuerySchema = z.object({
  auditId: z.string().min(1),
  format: z.enum(["csv", "pdf"]).default("csv"),
});

export const executiveReportSchema = z.object({
  auditId: z.string().min(1),
});
