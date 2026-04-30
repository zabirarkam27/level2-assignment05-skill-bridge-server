import { z } from "zod/v4";

export const createAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6, "Day of week must be 0-6 (Sunday-Saturday)"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format (HH:MM)"),
});

export const updateAvailabilitySchema = z.object({
  id: z.string().uuid("Invalid availability ID"),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

export const deleteAvailabilitySchema = z.object({
  id: z.string().uuid("Invalid availability ID"),
});

export const bulkUpdateAvailabilitySchema = z.object({
  slots: z.array(createAvailabilitySchema),
});

export type CreateAvailabilityPayload = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityPayload = z.infer<typeof updateAvailabilitySchema>;
export type DeleteAvailabilityPayload = z.infer<typeof deleteAvailabilitySchema>;