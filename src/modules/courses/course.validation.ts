import { z } from "zod";

export const createCourseSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  description: z.string().max(2000).optional(),
  image: z.string().url().optional().or(z.literal("")),
  categoryId: z.string().uuid("Invalid category ID"),
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).optional(),
  image: z.string().url().optional().or(z.literal("")),
  categoryId: z.string().uuid().optional(),
});

export const togglePopularSchema = z.object({
  isPopular: z.boolean(),
});

export type CreateCoursePayload = z.infer<typeof createCourseSchema>;
export type UpdateCoursePayload = z.infer<typeof updateCourseSchema>;
