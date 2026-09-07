import { z } from "zod";

export const dashboardQuerySchema = z.object({
  organizationId: z.string().optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
