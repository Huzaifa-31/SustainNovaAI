import { z } from "zod";

export const createFactorySchema = z.object({
  organizationId: z.string().min(1, "Organization is required"),
  name: z.string().min(1, "Factory name is required").max(200),
  description: z.string().max(1000).optional(),
  location: z.string().max(500).optional(),
});

export const updateFactorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  location: z.string().max(500).optional(),
});

export type CreateFactoryInput = z.infer<typeof createFactorySchema>;
export type UpdateFactoryInput = z.infer<typeof updateFactorySchema>;
