import { prisma } from "../../lib/prisma";
import {
  CreateAvailabilityPayload,
  UpdateAvailabilityPayload,
} from "./availability.validation";

const createAvailability = async (tutorId: string, payload: CreateAvailabilityPayload) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }

  const existing = await prisma.availability.findFirst({
    where: {
      tutorId: tutorProfile.id,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
    },
  });

  if (existing) {
    throw new Error("Availability slot already exists");
  }

  const result = await prisma.availability.create({
    data: {
      tutorId: tutorProfile.id,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
    },
  });

  return result;
};

const getTutorAvailability = async (tutorId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }

  return await prisma.availability.findMany({
    where: { tutorId: tutorProfile.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
};

const updateAvailability = async (tutorId: string, payload: UpdateAvailabilityPayload) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }

  const existing = await prisma.availability.findFirst({
    where: {
      id: payload.id,
      tutorId: tutorProfile.id,
    },
  });

  if (!existing) {
    throw new Error("Availability not found");
  }

  const result = await prisma.availability.update({
    where: { id: payload.id },
    data: {
      ...(payload.dayOfWeek !== undefined && { dayOfWeek: payload.dayOfWeek }),
      ...(payload.startTime !== undefined && { startTime: payload.startTime }),
      ...(payload.endTime !== undefined && { endTime: payload.endTime }),
    },
  });

  return result;
};

const deleteAvailability = async (tutorId: string, availabilityId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }

  const existing = await prisma.availability.findFirst({
    where: {
      id: availabilityId,
      tutorId: tutorProfile.id,
    },
  });

  if (!existing) {
    throw new Error("Availability not found");
  }

  await prisma.availability.delete({
    where: { id: availabilityId },
  });

  return { message: "Availability deleted successfully" };
};

const getPublicTutorAvailability = async (tutorId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { id: tutorId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor not found");
  }

  return await prisma.availability.findMany({
    where: { tutorId: tutorProfile.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
};
const bulkUpdateAvailability = async (tutorId: string, slots: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }

  return await prisma.$transaction(async (tx) => {
    // Delete all existing slots
    await tx.availability.deleteMany({
      where: { tutorId: tutorProfile.id },
    });

    // Create new slots
    const results = await Promise.all(
      slots.map((slot) =>
        tx.availability.create({
          data: {
            tutorId: tutorProfile.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        })
      )
    );

    return results;
  });
};

export const AvailabilityService = {
  createAvailability,
  getTutorAvailability,
  updateAvailability,
  deleteAvailability,
  getPublicTutorAvailability,
  bulkUpdateAvailability,
};