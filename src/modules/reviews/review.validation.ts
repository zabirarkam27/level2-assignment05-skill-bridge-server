import { z } from "zod/v4";

export const createReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().min(1, "Comment is required"),
});

export type CreateReviewPayload = z.infer<typeof createReviewSchema>;