import { z } from "zod";

export const compareAuditsQuerySchema = z.object({
  previousAuditId: z.string().optional(),
});
