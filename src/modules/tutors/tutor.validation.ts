import { z } from "zod";

export const createTutorSchema = z.object({
  body: z.object({
    bio: z.string().min(10),
    subjects: z.array(z.string()).min(1),
    price: z.coerce.number().min(100, "Price must be at least ৳100 for Stripe payment"),
  }),
});

export const updateTutorSchema = z.object({
  body: z.object({
    bio: z.string().optional(),
    subjects: z.array(z.string()).optional(),
    price: z.coerce.number().min(100, "Price must be at least ৳100 for Stripe payment").optional(),
  }),
});
