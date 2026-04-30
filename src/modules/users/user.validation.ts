import { z } from "zod/v4";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  image: z.string().url().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["STUDENT", "TUTOR", "ADMIN"]),
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
export type UpdateUserRolePayload = z.infer<typeof updateUserRoleSchema>;