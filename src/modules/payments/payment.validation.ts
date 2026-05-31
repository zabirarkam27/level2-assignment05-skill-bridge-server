import { z } from "zod/v4";
import { createBookingSchema } from "../bookings/booking.validation";

export const initiatePaymentSchema = createBookingSchema;

export const stripeSuccessSchema = z.object({
  session_id: z.string().min(1, "Missing Stripe checkout session ID"),
});

export const stripeCancelSchema = z.object({
  payment_id: z.string().optional(),
});

export type InitiatePaymentPayload = z.infer<typeof initiatePaymentSchema>;
