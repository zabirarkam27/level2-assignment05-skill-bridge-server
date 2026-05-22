import { prisma } from "../../lib/prisma";
import { BookingStatus, Prisma } from "@prisma/client";
import {
  CreateBookingPayload,
  UpdateBookingStatusPayload,
} from "./booking.validation";
import {
  buildSessionDateTime,
  dayOfWeekFromDateString,
} from "../../helpers/booking.helpers";

const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
] as const;

const createBooking = async (
  studentId: string,
  payload: CreateBookingPayload,
) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: payload.tutorId },
    include: {
      user: { select: { status: true } },
    },
  });

  if (!tutor) {
    throw new Error("Tutor not found");
  }

  if (tutor.user?.status !== "ACTIVE") {
    throw new Error("This tutor is not available for bookings");
  }

  if (tutor.userId === studentId) {
    throw new Error("You cannot book your own session");
  }

  const course = await prisma.course.findFirst({
    where: {
      id: payload.courseId,
      tutorId: tutor.userId,
      tutor: {
        role: "TUTOR",
        status: "ACTIVE",
      },
    },
    select: { id: true },
  });

  if (!course) {
    throw new Error("Please select a valid course for this mentor");
  }

  const slot = await prisma.availability.findFirst({
    where: {
      id: payload.availabilityId,
      tutorId: payload.tutorId,
    },
  });

  if (!slot) {
    throw new Error("Selected time slot is not available for this tutor");
  }

  const selectedDay = dayOfWeekFromDateString(payload.date);
  if (selectedDay !== slot.dayOfWeek) {
    throw new Error("Selected date does not match the chosen day of week");
  }

  const bookingDate = buildSessionDateTime(payload.date, slot.startTime);
  if (bookingDate <= new Date()) {
    throw new Error("Booking date must be in the future");
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const conflicting = await tx.booking.findFirst({
          where: {
            tutorId: payload.tutorId,
            dateTime: bookingDate,
            status: { in: [...ACTIVE_BOOKING_STATUSES] },
          },
        });

        if (conflicting) {
          throw new Error("This time slot is already booked");
        }

        return tx.booking.create({
          data: {
            studentId,
            tutorId: payload.tutorId,
            courseId: payload.courseId,
            dateTime: bookingDate,
            status: BookingStatus.PENDING,
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            tutor: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            course: {
              include: {
                category: {
                  select: { id: true, name: true, description: true, image: true },
                },
              },
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new Error("This time slot is already booked");
    }

    throw error;
  }
};

const getStudentBookings = async (studentId: string) => {
  return await prisma.booking.findMany({
    where: { studentId },
    include: {
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      course: {
        include: {
          category: {
            select: { id: true, name: true, description: true, image: true },
          },
        },
      },
      review: true,
    },
    orderBy: { dateTime: "desc" },
  });
};

const getTutorBookings = async (tutorId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }

  return await prisma.booking.findMany({
    where: { tutorId: tutorProfile.id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      course: {
        include: {
          category: {
            select: { id: true, name: true, description: true, image: true },
          },
        },
      },
      review: true,
    },
    orderBy: { dateTime: "desc" },
  });
};

const getSingleBooking = async (
  bookingId: string,
  userId: string,
  role: string,
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      course: {
        include: {
          category: {
            select: { id: true, name: true, description: true, image: true },
          },
        },
      },
      review: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (role === "STUDENT" && booking.studentId !== userId) {
    throw new Error("Unauthorized");
  }

  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });
    if (tutorProfile && booking.tutorId !== tutorProfile.id) {
      throw new Error("Unauthorized");
    }
  }

  return booking;
};

const updateBookingStatus = async (
  bookingId: string,
  userId: string,
  role: string,
  status: UpdateBookingStatusPayload["status"],
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (role === "STUDENT" && booking.studentId !== userId) {
    throw new Error("Unauthorized");
  }

  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });
    if (!tutorProfile || booking.tutorId !== tutorProfile.id) {
      throw new Error("Unauthorized");
    }
  }

  if (role === "ADMIN") {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  }

  if (status === "CANCELLED" && role === "STUDENT") {
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      throw new Error("Only pending or confirmed bookings can be cancelled");
    }
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
  }

  if (role === "TUTOR") {
    if (status === "CONFIRMED") {
      if (booking.status !== "PENDING") {
        throw new Error("Only pending bookings can be confirmed");
      }
      return await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });
    }

    if (status === "COMPLETED") {
      if (booking.status !== "CONFIRMED") {
        throw new Error("Only confirmed sessions can be marked as completed");
      }
      return await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED" },
      });
    }
  }

  throw new Error("Invalid status update");
};

const getAllBookings = async () => {
  return await prisma.booking.findMany({
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      course: {
        include: {
          category: {
            select: { id: true, name: true, description: true, image: true },
          },
        },
      },
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const BookingService = {
  createBooking,
  getStudentBookings,
  getTutorBookings,
  getSingleBooking,
  updateBookingStatus,
  getAllBookings,
};
