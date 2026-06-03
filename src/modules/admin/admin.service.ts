import { prisma } from "../../lib/prisma";
import { UserStatus } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import {
  getValidCategorySubjects,
  syncTutorCategories,
} from "../../utils/tutorCategorySync";
import { BookingService } from "../bookings/booking.service";
import { NotificationService } from "../notifications/notification.service";

const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      email: true,
      emailVerified: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,

      tutorProfile: {
        select: {
          id: true,
          rating: true,
          price: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSingleUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      name: true,
      image: true,
      email: true,
      emailVerified: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,

      tutorProfile: {
        include: {
          categories: true,
          availabilities: true,

          reviews: {
            include: {
              booking: {
                include: {
                  student: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      image: true,
                    },
                  },
                },
              },
            },
          },
        },
      },

      bookingsAsStudent: {
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
        },

        orderBy: {
          dateTime: "desc",
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const updateUserStatus = async (
  userId: string,
  status: "ACTIVE" | "BANNED",
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (status === "BANNED" && user.role === "TUTOR") {
    const assignedCourses = await prisma.course.count({
      where: { tutorId: userId },
    });

    if (assignedCourses > 0) {
      throw new Error(
        "Reassign or delete this tutor's assigned courses before banning",
      );
    }
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      name: true,
      image: true,
      email: true,
      role: true,
      status: true,
    },
  });
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

  return BookingService.attachPaymentsToBookings(bookings);
};

const getDashboardStats = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalTutors,
    totalStudents,
    totalBookings,
    totalCategories,
    paidRevenue,
    paidPayments,
    bookingStatusGroups,
    courses,
    tutors,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "TUTOR" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.booking.count(),
    prisma.category.count(),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: { status: "PAID", createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, createdAt: true, tutorId: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.course.findMany({
      include: {
        category: { select: { name: true } },
        tutor: { select: { name: true } },
        _count: { select: { bookings: true, wishlists: true } },
      },
    }),
    prisma.tutorProfile.findMany({
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { bookings: true, reviews: true, wishlists: true } },
      },
    }),
  ]);

  const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
  const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(sixMonthsAgo);
    date.setMonth(sixMonthsAgo.getMonth() + index);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const total = paidPayments
      .filter((payment) => {
        const paymentDate = new Date(payment.createdAt);
        return `${paymentDate.getFullYear()}-${paymentDate.getMonth()}` === key;
      })
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      month: monthFormatter.format(date),
      revenue: total,
    };
  });

  const bookingStatusData = bookingStatusGroups.map((item) => ({
    status: item.status,
    count: item._count.status,
  }));

  const revenueByTutorId = paidPayments.reduce<Record<string, number>>(
    (acc, payment) => {
      acc[payment.tutorId] = (acc[payment.tutorId] ?? 0) + payment.amount;
      return acc;
    },
    {},
  );

  const popularCourses = courses
    .map((course) => ({
      id: course.id,
      title: course.title,
      category: course.category.name,
      tutor: course.tutor?.name ?? "Unassigned",
      bookings: course._count.bookings,
      saved: course._count.wishlists,
    }))
    .sort((a, b) => b.bookings + b.saved - (a.bookings + a.saved))
    .slice(0, 6);

  const topTutors = tutors
    .map((tutor) => ({
      id: tutor.id,
      userId: tutor.userId,
      name: tutor.user.name,
      image: tutor.user.image,
      rating: tutor.rating,
      bookings: tutor._count.bookings,
      reviews: tutor._count.reviews,
      saved: tutor._count.wishlists,
      revenue: revenueByTutorId[tutor.id] ?? 0,
    }))
    .sort((a, b) => b.revenue + b.bookings - (a.revenue + a.bookings))
    .slice(0, 6);

  const recentBookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: { name: true, email: true, image: true },
      },
      tutor: {
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const completedBookings = await prisma.booking.count({
    where: { status: "COMPLETED" },
  });

  return {
    totalUsers,
    totalTutors,
    totalStudents,
    totalBookings,
    totalCategories,
    completedBookings,
    revenue: paidRevenue._sum.amount ?? 0,
    monthlyRevenue,
    bookingStatusData,
    popularCourses,
    topTutors,
    recentBookings,
  };
};

const makeTutor = async (
  userId: string,
  profileData: { bio: string; subjects: string[]; price: number },
) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.role === "TUTOR") throw new Error("User is already a tutor");

    await tx.user.update({
      where: { id: userId },
      data: { role: "TUTOR", status: UserStatus.ACTIVE },
    });

    const validSubjects = await getValidCategorySubjects(
      tx,
      profileData.subjects,
    );

    if (validSubjects.length === 0) {
      throw new Error("Select at least one valid category as a subject");
    }

    const profile = await tx.tutorProfile.create({
      data: {
        userId,
        bio: profileData.bio,
        subjects: validSubjects,
        price: profileData.price,
      },
    });

    await syncTutorCategories(tx, profile.id, validSubjects);

    return profile;
  });
};

const undoTutor = async (userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { tutorProfile: { select: { id: true } } },
    });

    if (!user) throw new Error("User not found");
    if (user.role !== "TUTOR") throw new Error("User is not a tutor");

    const assignedCourses = await tx.course.count({
      where: { tutorId: userId },
    });

    if (assignedCourses > 0) {
      throw new Error(
        "Reassign or delete this tutor's assigned courses before undoing tutor",
      );
    }

    if (user.tutorProfile) {
      await tx.tutorProfile.delete({ where: { id: user.tutorProfile.id } });
    }

    return await tx.user.update({
      where: { id: userId },
      data: { role: "STUDENT", status: UserStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        image: true,
        email: true,
        role: true,
        status: true,
      },
    });
  });
};

const createTutor = async (
  userData: { name: string; email: string },
  profileData: { bio: string; subjects: string[]; price: number },
) => {
  const generatedPassword =
    Math.random().toString(36).slice(-10) +
    Math.random().toString(36).slice(-4).toUpperCase();
  const hashedPassword = await hashPassword(generatedPassword);

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: userData.email },
    });
    if (existing) throw new Error("A user with this email already exists");

    const user = await tx.user.create({
      data: {
        ...userData,
        role: "TUTOR",
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });

    await tx.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const validSubjects = await getValidCategorySubjects(
      tx,
      profileData.subjects,
    );

    if (validSubjects.length === 0) {
      throw new Error("Select at least one valid category as a subject");
    }

    const profile = await tx.tutorProfile.create({
      data: {
        userId: user.id,
        bio: profileData.bio,
        subjects: validSubjects,
        price: profileData.price,
      },
    });

    await syncTutorCategories(tx, profile.id, validSubjects);

    return { user, profile, generatedPassword };
  });
};

const getPendingTutors = async () => {
  return await prisma.user.findMany({
    where: { role: "TUTOR", status: UserStatus.PENDING },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      status: true,
      tutorProfile: {
        select: { id: true, bio: true, subjects: true, price: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const approveTutor = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "TUTOR") throw new Error("User is not a tutor");
  if (user.status !== UserStatus.PENDING)
    throw new Error("User is not pending approval");

  const approvedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  await NotificationService.createNotification({
    userId,
    title: "Tutor Request Approved",
    message: "You are now an approved tutor on SkillBridge",
    type: "TUTOR_REQUEST_APPROVED",
    link: "/tutor/dashboard",
    entityId: userId,
  });

  return approvedUser;
};

const rejectTutor = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "TUTOR") throw new Error("User is not a tutor");
  if (user.status !== UserStatus.PENDING)
    throw new Error("User is not pending approval");

  const rejectedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.REJECTED },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  await NotificationService.createNotification({
    userId,
    title: "Tutor Request Rejected",
    message: "Your tutor request was rejected. Please contact support for details.",
    type: "TUTOR_REQUEST_REJECTED",
    link: "/dashboard/profile",
    entityId: userId,
  });

  return rejectedUser;
};

const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tutorProfile: { select: { id: true } } },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === "TUTOR") {
    const assignedCourses = await prisma.course.count({
      where: { tutorId: userId },
    });

    if (assignedCourses > 0) {
      throw new Error(
        "Reassign or delete this tutor's assigned courses before deleting",
      );
    }
  }

  return await prisma.$transaction(async (tx) => {
    // If the user is a tutor, clean up their profile and all related records
    if (user.tutorProfile) {
      const tutorId = user.tutorProfile.id;
      await tx.review.deleteMany({ where: { tutorId } });
      await tx.booking.deleteMany({ where: { tutorId } });
      await tx.availability.deleteMany({ where: { tutorId } });
      await tx.tutorCategory.deleteMany({ where: { tutorId } });
      await tx.tutorProfile.delete({ where: { id: tutorId } });
    }

    // Clean up student-side bookings and their reviews
    const studentBookings = await tx.booking.findMany({
      where: { studentId: userId },
      select: { id: true },
    });
    if (studentBookings.length > 0) {
      const bookingIds = studentBookings.map((b) => b.id);
      await tx.review.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.booking.deleteMany({ where: { studentId: userId } });
    }

    // Session and Account cascade automatically via schema onDelete: Cascade
    return await tx.user.delete({ where: { id: userId } });
  });
};

export const AdminService = {
  getAllUsers,
  getSingleUser,
  updateUserStatus,
  getAllBookings,
  getDashboardStats,
  makeTutor,
  undoTutor,
  createTutor,
  deleteUser,
  getPendingTutors,
  approveTutor,
  rejectTutor,
};
