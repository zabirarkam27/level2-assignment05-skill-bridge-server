import { z } from "zod";

export const createContactMessageSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Please provide a valid email address").max(120),
  subject: z.string().trim().min(4, "Subject must be at least 4 characters").max(120),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1200),
});

export type CreateContactMessagePayload = z.infer<
  typeof createContactMessageSchema
>;
