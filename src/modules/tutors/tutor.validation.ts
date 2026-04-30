import { z } from "zod";

export const createTutorSchema = z.object({
  body: z.object({
    bio: z.string().min(10),
    subjects: z.array(z.string()).min(1),
    price: z.number().min(0),
  }),
});

export const updateTutorSchema = z.object({
  body: z.object({
    bio: z.string().optional(),
    subjects: z.array(z.string()).optional(),
    price: z.number().optional(),
  }),
});