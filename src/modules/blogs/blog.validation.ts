import { z } from "zod";

export const createBlogSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(140),
  excerpt: z.string().trim().min(20, "Excerpt must be at least 20 characters").max(260),
  content: z.string().trim().min(120, "Content must be at least 120 characters"),
  image: z.string().trim().url("Image must be a valid URL").optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
  isPublished: z.boolean().optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

export type CreateBlogPayload = z.infer<typeof createBlogSchema>;
export type UpdateBlogPayload = z.infer<typeof updateBlogSchema>;
