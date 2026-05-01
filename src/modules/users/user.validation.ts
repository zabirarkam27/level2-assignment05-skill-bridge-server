import { z } from "zod/v4";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  // Empty string means "clear the image"; a non-empty value must be a valid URL
  image: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().url("Image must be a valid URL").nullable().optional(),
  ),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["STUDENT", "TUTOR", "ADMIN"]),
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
export type UpdateUserRolePayload = z.infer<typeof updateUserRoleSchema>;