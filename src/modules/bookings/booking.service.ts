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
import { CertificateService } from "../certificates/certificate.service";
import { NotificationService } from "../notifications/notification.service";
import { GoogleCalendarService } from "../../services/googleCalendar.service";

const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
] as const;

const hasSessionStarted = (dateTime: Date) => dateTime.getTime() <= Date.now();

const ensurePendingBooking = (booking: { status: BookingStatus }) => {
  if (booking.status !== BookingStatus.PENDING) {
    throw new Error("Only pending bookings can be confirmed");
  }
};

const ensureConfirmedBooking = (booking: { status: BookingStatus }) => {
  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new Error("Only confirmed sessions can be marked as completed");
  }
};

const ensureSessionCanBeCompleted = (booking: {
  status: BookingStatus;
  dateTime: Date;
}) => {
  ensureConfirmedBooking(booking);

  if (!hasSessionStarted(booking.dateTime)) {
    throw new Error("Session cannot be completed before its scheduled time");
  }
};

const ensureAdminCanCancelBooking = (booking: { status: BookingStatus }) => {
  if (
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.CONFIRMED
  ) {
    throw new Error("Only pending or confirmed bookings can be cancelled");
  }
};

const paymentSelect = {
  id: true,
  bookingId: true,
  status: true,
  gateway: true,
  amount: true,
  currency: true,
  transactionId: true,
  createdAt: true,
} as const;

const attachPaymentsToBookings = async <T extends { id: string }>(
  bookings: T[],
) => {
  if (bookings.length === 0) {
    return bookings.map((booking) => ({ ...booking, payment: null }));
  }

  const payments = await prisma.payment.findMany({
    where: { bookingId: { in: bookings.map((booking) => booking.id) } },
    select: paymentSelect,
  });

  const paymentByBookingId = new Map(
    payments
      .filter((payment) => payment.bookingId)
      .map((payment) => [payment.bookingId as string, payment]),
  );

  return bookings.map((booking) => ({
    ...booking,
    payment: paymentByBookingId.get(booking.id) ?? null,
  }));
};

const ensureBookingPaymentPaid = async (bookingId: string) => {
  const payment = await prisma.payment.findFirst({
    where: { bookingId },
    select: { status: true },
  });

  if (payment?.status !== "PAID") {
    throw new Error("Payment must be completed before confirming this booking");
  }
};

const getBookingNotificationContext = async (bookingId: string) => {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { select: { id: true, name: true } },
      tutor: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      course: { select: { id: true, title: true } },
    },
  });
};

const notifyBookingCreated = async (bookingId: string) => {
  const booking = await getBookingNotificationContext(bookingId);
  if (!booking) return null;

  return NotificationService.createNotification({
    userId: booking.tutor.userId,
    title: "New Booking Request",
    message: `${booking.student.name} booked ${booking.course?.title ?? "a session"}`,
    type: "BOOKING_CREATED",
    link: "/tutor/sessions",
    entityId: booking.id,
  });
};

const validateBookingRequest = async (
  studentId: string,
  payload: CreateBookingPayload,
) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: payload.tutorId },
    include: {
      user: { select: { name: true, status: true } },
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
    select: { id: true, title: true },
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

  const conflicting = await prisma.booking.findFirst({
    where: {
      tutorId: payload.tutorId,
      dateTime: bookingDate,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
  });

  if (conflicting) {
    throw new Error("This time slot is already booked");
  }

  return {
    tutor,
    course,
    slot,
    bookingDate,
    amount: tutor.price,
  };
};

const createBooking = async (
  studentId: string,
  payload: CreateBookingPayload,
) => {
  const { bookingDate } = await validateBookingRequest(studentId, payload);

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

    await notifyBookingCreated(result.id);

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
  const bookings = await prisma.booking.findMany({
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

  return attachPaymentsToBookings(bookings);
};

const getTutorBookings = async (tutorId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }

  const bookings = await prisma.booking.findMany({
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

  return attachPaymentsToBookings(bookings);
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

  const [bookingWithPayment] = await attachPaymentsToBookings([booking]);
  return bookingWithPayment;
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
    if (status === "CONFIRMED") {
      ensurePendingBooking(booking);
      if (hasSessionStarted(booking.dateTime)) {
        throw new Error("Past sessions cannot be confirmed");
      }
      await ensureBookingPaymentPaid(bookingId);
    }

    if (status === "CANCELLED") {
      ensureAdminCanCancelBooking(booking);
    }

    if (status === "COMPLETED") {
      ensureSessionCanBeCompleted(booking);
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    if (status === "CONFIRMED") {
      await NotificationService.createNotification({
        userId: updatedBooking.studentId,
        title: "Booking Confirmed",
        message: "Your booking has been confirmed",
        type: "BOOKING_CONFIRMED",
        link: "/dashboard/bookings",
        entityId: updatedBooking.id,
      });

      const calendarBooking =
        await GoogleCalendarService.createBookingCalendarEvent(
          updatedBooking.id,
        );

      return calendarBooking ?? updatedBooking;
    }

    if (status === "CANCELLED") {
      await GoogleCalendarService.deleteBookingCalendarEvent(updatedBooking.id);

      await NotificationService.createNotifications([
        {
          userId: updatedBooking.studentId,
          title: "Booking Cancelled",
          message: "Your booking was cancelled",
          type: "BOOKING_CANCELLED",
          link: "/dashboard/bookings",
          entityId: updatedBooking.id,
        },
      ]);
    }

    if (status === "COMPLETED" && updatedBooking.courseId) {
      await CertificateService.issueForCompletedBooking(bookingId);
      await NotificationService.createNotification({
        userId: updatedBooking.studentId,
        title: "Session Completed",
        message: "You can now leave a review and download your certificate",
        type: "SESSION_COMPLETED",
        link: "/dashboard/bookings",
        entityId: updatedBooking.id,
      });
    }

    return updatedBooking;
  }

  if (status === "CANCELLED" && role === "STUDENT") {
    if (booking.status !== "PENDING") {
      throw new Error("Only pending bookings can be cancelled by students");
    }
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    }).then(async (cancelledBooking) => {
      const context = await getBookingNotificationContext(cancelledBooking.id);
      if (context) {
        await NotificationService.createNotification({
          userId: context.tutor.userId,
          title: "Booking Cancelled",
          message: `${context.student.name} cancelled the booking`,
          type: "BOOKING_CANCELLED",
          link: "/tutor/sessions",
          entityId: cancelledBooking.id,
        });
      }

      const bookingWithoutCalendar =
        await GoogleCalendarService.deleteBookingCalendarEvent(
          cancelledBooking.id,
        );

      return bookingWithoutCalendar ?? cancelledBooking;
    });
  }

  if (role === "TUTOR") {
    if (status === "CONFIRMED") {
      ensurePendingBooking(booking);

      if (hasSessionStarted(booking.dateTime)) {
        throw new Error("Past sessions cannot be confirmed");
      }

      await ensureBookingPaymentPaid(bookingId);

      const confirmedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });

      await NotificationService.createNotification({
        userId: confirmedBooking.studentId,
        title: "Booking Confirmed",
        message: "Your booking has been confirmed",
        type: "BOOKING_CONFIRMED",
        link: "/dashboard/bookings",
        entityId: confirmedBooking.id,
      });

      const calendarBooking =
        await GoogleCalendarService.createBookingCalendarEvent(
          confirmedBooking.id,
        );

      return calendarBooking ?? confirmedBooking;
    }

    if (status === "COMPLETED") {
      ensureSessionCanBeCompleted(booking);

      const completedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED" },
      });

      if (completedBooking.courseId) {
        await CertificateService.issueForCompletedBooking(bookingId);
      }

      await NotificationService.createNotification({
        userId: completedBooking.studentId,
        title: "Session Completed",
        message: "You can now leave a review and download your certificate",
        type: "SESSION_COMPLETED",
        link: "/dashboard/bookings",
        entityId: completedBooking.id,
      });

      return completedBooking;
    }
  }

  throw new Error("Invalid status update");
};

const getAllBookings = async () => {
  const bookings = await prisma.booking.findMany({
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

  return attachPaymentsToBookings(bookings);
};

export const BookingService = {
  createBooking,
  validateBookingRequest,
  getStudentBookings,
  getTutorBookings,
  getSingleBooking,
  updateBookingStatus,
  getAllBookings,
  attachPaymentsToBookings,
  notifyBookingCreated,
};
