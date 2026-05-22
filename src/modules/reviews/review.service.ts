import { prisma } from "../../lib/prisma";
import { CreateReviewPayload } from "./review.validation";

const createReview = async (
  studentId: string,
  payload: CreateReviewPayload,
) => {
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

  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
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

    const tutorReviews = await tx.review.findMany({
      where: { tutorId: booking.tutorId },
    });

    const avgRating =
      tutorReviews.length > 0
        ? tutorReviews.reduce((sum, r) => sum + r.rating, 0) /
          tutorReviews.length
        : 0;

    await tx.tutorProfile.update({
      where: { id: booking.tutorId },
      data: { rating: avgRating },
    });

    return review;
  });

  return result;
};

const getTutorReviews = async (tutorId: string, includeHidden = false) => {
  return await prisma.review.findMany({
    where: {
      tutorId,
      ...(includeHidden ? {} : { isHidden: false }),
    },
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

const getPublicReviews = async () => {
  return await prisma.review.findMany({
    where: { isHidden: false },
    include: {
      booking: {
        include: {
          student: {
            select: { id: true, name: true, email: true, image: true },
          },
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

const toggleReviewVisibility = async (
  reviewId: string,
  userId: string,
  role: string,
) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Review not found");

  if (role === "TUTOR") {
    const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
    if (!profile || review.tutorId !== profile.id) {
      throw new Error("You can only manage reviews on your own profile");
    }
  }

  return await prisma.review.update({
    where: { id: reviewId },
    data: { isHidden: !review.isHidden },
    select: { id: true, isHidden: true },
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
  getPublicReviews,
  getTutorReviews,
  toggleReviewVisibility,
  getStudentReviews,
};
