import { prisma } from "../../lib/prisma";
import { UserStatus } from "@prisma/client";

const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
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
    orderBy: { createdAt: "desc" },
  });
};

const getSingleUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
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
                },
              },
            },
          },
        },
        orderBy: { dateTime: "desc" },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const updateUserStatus = async (userId: string, status: "ACTIVE" | "BANNED") => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });
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

const getDashboardStats = async () => {
  const [totalUsers, totalTutors, totalStudents, totalBookings, totalCategories] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "TUTOR" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.booking.count(),
    prisma.category.count(),
  ]);

  const recentBookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: { name: true, email: true },
      },
      tutor: {
        include: {
          user: {
            select: { name: true },
          },
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
    recentBookings,
  };
};

const makeTutor = async (userId: string, profileData: { bio: string; subjects: string[]; price: number }) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.role === "TUTOR") throw new Error("User is already a tutor");

    await tx.user.update({
      where: { id: userId },
      data: { role: "TUTOR" },
    });

    return await tx.tutorProfile.create({
      data: {
        userId,
        ...profileData,
      },
    });
  });
};

const createTutor = async (userData: { name: string; email: string }, profileData: { bio: string; subjects: string[]; price: number }) => {
  const generatedPassword = Math.random().toString(36).slice(-10);
  
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        ...userData,
        role: "TUTOR",
        emailVerified: true,
      },
    });

    const profile = await tx.tutorProfile.create({
      data: {
        userId: user.id,
        ...profileData,
      },
    });

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
  if (user.status !== UserStatus.PENDING) throw new Error("User is not pending approval");

  return await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
};

const rejectTutor = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "TUTOR") throw new Error("User is not a tutor");
  if (user.status !== UserStatus.PENDING) throw new Error("User is not pending approval");

  return await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.REJECTED },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
};

const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tutorProfile: { select: { id: true } } },
  });

  if (!user) {
    throw new Error("User not found");
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
  createTutor,
  deleteUser,
  getPendingTutors,
  approveTutor,
  rejectTutor,
};