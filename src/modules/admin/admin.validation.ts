import { z } from "zod/v4";

export const makeTutorSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters").max(1000, "Bio must be 1000 characters or less"),
  subjects: z.array(z.string().min(1)).min(1, "At least one subject is required"),
  price: z.coerce.number().min(100, "Price must be at least ৳100 for Stripe payment"),
});

export const createTutorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or less"),
  email: z.string().email("Invalid email address"),
  bio: z.string().min(10, "Bio must be at least 10 characters").max(1000, "Bio must be 1000 characters or less"),
  subjects: z.array(z.string().min(1)).min(1, "At least one subject is required"),
  price: z.coerce.number().min(100, "Price must be at least ৳100 for Stripe payment"),
});

export type MakeTutorPayload = z.infer<typeof makeTutorSchema>;
export type CreateTutorPayload = z.infer<typeof createTutorSchema>;
