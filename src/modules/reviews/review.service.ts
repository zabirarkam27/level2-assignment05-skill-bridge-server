import { prisma } from "../../lib/prisma";
import { CreateReviewPayload } from "./review.validation";

const createReview = async (studentId: string, payload: CreateReviewPayload) => {
  const booking = await prisma.booking.findUnique({
    where: { id: payload.bookingId },
    include: { review: true },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.studentId !== studentId) {
    throw new Error("Unauthorized");
  }

  if (booking.status !== "COMPLETED") {
    throw new Error("Can only review completed bookings");
  }

  if (booking.review) {
    throw new Error("Review already exists for this booking");
  }

  const result = await prisma.review.create({
    data: {
      bookingId: payload.bookingId,
      studentId,
      tutorId: booking.tutorId,
      rating: payload.rating,
      comment: payload.comment,
    },
    include: {
      booking: {
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
          tutor: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  const tutorReviews = await prisma.review.findMany({
    where: { tutorId: booking.tutorId },
  });

  const avgRating = tutorReviews.reduce((sum, r) => sum + r.rating, 0) / tutorReviews.length;

  await prisma.tutorProfile.update({
    where: { id: booking.tutorId },
    data: { rating: avgRating },
  });

  return result;
};

const getTutorReviews = async (tutorId: string) => {
  return await prisma.review.findMany({
    where: { tutorId },
    include: {
      booking: {
        include: {
          student: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getStudentReviews = async (studentId: string) => {
  return await prisma.review.findMany({
    where: { studentId },
    include: {
      booking: {
        include: {
          tutor: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const ReviewService = {
  createReview,
  getTutorReviews,
  getStudentReviews,
};