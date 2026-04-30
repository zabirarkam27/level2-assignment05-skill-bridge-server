import { z } from "zod/v4";

export const createBookingSchema = z.object({
  tutorId: z.string().uuid("Invalid tutor ID"),
  dateTime: z.string().datetime("Invalid date/time format"),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]),
});

export type CreateBookingPayload = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusPayload = z.infer<typeof updateBookingStatusSchema>;