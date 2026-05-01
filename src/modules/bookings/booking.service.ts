import { prisma } from "../../lib/prisma";
import { CreateBookingPayload } from "./booking.validation";

const createBooking = async (studentId: string, payload: CreateBookingPayload) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: payload.tutorId },
  });

  if (!tutor) {
    throw new Error("Tutor not found");
  }

  if (tutor.userId === studentId) {
    throw new Error("You cannot book your own session");
  }

  const bookingDate = new Date(payload.dateTime);
  if (bookingDate <= new Date()) {
    throw new Error("Booking date must be in the future");
  }

  const result = await prisma.booking.create({
    data: {
      studentId,
      tutorId: payload.tutorId,
      dateTime: bookingDate,
      status: "CONFIRMED",
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
    },
  });

  return result;
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
      review: true,
    },
    orderBy: { dateTime: "desc" },
  });
};

const getSingleBooking = async (bookingId: string, userId: string, role: string) => {
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

const updateBookingStatus = async (bookingId: string, userId: string, role: string, status: string) => {
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
      data: { status: status as any },
    });
  }

  if (status === "CANCELLED" && role === "STUDENT") {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
  }

  if ((status === "CONFIRMED" || status === "COMPLETED") && role === "TUTOR") {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status: status as any },
    });
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