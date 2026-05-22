import { z } from "zod/v4";

export const createBookingSchema = z.object({
  tutorId: z.string().uuid("Invalid tutor ID"),
  courseId: z.string().uuid("Invalid course ID"),
  availabilityId: z.string().uuid("Invalid availability slot ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]),
});

export type CreateBookingPayload = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusPayload = z.infer<typeof updateBookingStatusSchema>;
