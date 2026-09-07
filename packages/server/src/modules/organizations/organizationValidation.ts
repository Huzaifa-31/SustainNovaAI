import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  ownerName: z.string().min(1, "Owner name is required").max(200),
  ownerEmail: z.string().email("Valid owner email is required"),
  ownerPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});

export const updateServicesSchema = z.object({
  services: z.array(z.string()).optional(),
  tier: z.enum(["basic", "pro", "enterprise"]).optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "organization"]).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type UpdateServicesInput = z.infer<typeof updateServicesSchema>;
