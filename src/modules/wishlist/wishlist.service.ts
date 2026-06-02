import { prisma } from "../../lib/prisma";

const courseInclude = {
  category: {
    select: { id: true, name: true, description: true, image: true },
  },
  createdBy: {
    select: { id: true, name: true, image: true, role: true },
  },
  tutor: {
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      status: true,
      tutorProfile: { select: { id: true } },
    },
  },
  _count: { select: { wishlists: true } },
} as const;

const tutorInclude = {
  user: true,
  reviews: true,
  _count: { select: { wishlists: true } },
} as const;

const addCourse = async (userId: string, courseId: string) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  return prisma.wishlist.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId, type: "COURSE" },
  });
};

const addTutor = async (userId: string, tutorId: string) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: tutorId },
    include: { user: { select: { role: true, status: true } } },
  });
  if (!tutor || tutor.user.role !== "TUTOR" || tutor.user.status !== "ACTIVE") {
    throw new Error("Tutor not found");
  }

  return prisma.wishlist.upsert({
    where: { userId_tutorId: { userId, tutorId } },
    update: {},
    create: { userId, tutorId, type: "TUTOR" },
  });
};

const removeCourse = async (userId: string, courseId: string) => {
  return prisma.wishlist.deleteMany({
    where: { userId, courseId, type: "COURSE" },
  });
};

const removeTutor = async (userId: string, tutorId: string) => {
  return prisma.wishlist.deleteMany({
    where: { userId, tutorId, type: "TUTOR" },
  });
};

const getWishlist = async (userId: string) => {
  const [courseItems, tutorItems] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId, type: "COURSE", courseId: { not: null } },
      include: { course: { include: courseInclude } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wishlist.findMany({
      where: { userId, type: "TUTOR", tutorId: { not: null } },
      include: { tutor: { include: tutorInclude } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    courses: courseItems.flatMap((item) => (item.course ? [item.course] : [])),
    tutors: tutorItems.flatMap((item) => (item.tutor ? [item.tutor] : [])),
  };
};

export const WishlistService = {
  addCourse,
  addTutor,
  removeCourse,
  removeTutor,
  getWishlist,
};
