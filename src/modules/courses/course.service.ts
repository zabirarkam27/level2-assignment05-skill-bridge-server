import { prisma } from "../../lib/prisma";
import { CreateCoursePayload, UpdateCoursePayload } from "./course.validation";

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
    },
  },
} as const;

const db = prisma as any;

export interface CourseFilters {
  popular?: boolean;
  categoryId?: string;
  createdById?: string;
  tutorId?: string;
}

const getAllCourses = async (filters: CourseFilters = {}) => {
  return db.course.findMany({
    where: {
      ...(filters.popular && { isPopular: true }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.createdById && { createdById: filters.createdById }),
    },
    include: courseInclude,
    orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }],
  });
};

const getSingleCourse = async (id: string) => {
  const course = await db.course.findUnique({
    where: { id },
    include: courseInclude,
  });
  if (!course) throw new Error("Course not found");
  return course;
};

const createCourse = async (
  createdById: string,
  payload: CreateCoursePayload,
) => {
  const category = await prisma.category.findUnique({
    where: { id: payload.categoryId },
  });
  if (!category) throw new Error("Category not found");

  const tutorId = (payload as { tutorId?: string }).tutorId;
  if (tutorId) {
    const tutor = await prisma.user.findUnique({
      where: { id: tutorId },
    });

    if (!tutor || tutor.role !== "TUTOR") {
      throw new Error("Invalid tutor selected");
    }
  }

  return db.course.create({
    data: {
      title: payload.title,
      description: payload.description || null,
      image: payload.image || null,
      categoryId: payload.categoryId,
      createdById,
      tutorId: tutorId || null,
    },
    include: courseInclude,
  });
};

const updateCourse = async (
  id: string,
  userId: string,
  role: string,
  payload: UpdateCoursePayload,
) => {
  const course = await db.course.findUnique({ where: { id } });
  if (!course) throw new Error("Course not found");
  const tutorId = (payload as any).tutorId;
  if (tutorId !== undefined) {
    const tutor = await prisma.user.findUnique({
      where: { id: tutorId },
    });

    if (!tutor || tutor.role !== "TUTOR") {
      throw new Error("Invalid tutor selected");
    }
  }

  if (role !== "ADMIN" && course.createdById !== userId) {
    throw new Error("You can only edit your own courses");
  }

  if (payload.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: payload.categoryId },
    });
    if (!category) throw new Error("Category not found");
  }

  return db.course.update({
    where: { id },
    data: {
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.description !== undefined && {
        description: payload.description || null,
      }),
      ...(payload.image !== undefined && { image: payload.image || null }),
      ...(payload.categoryId !== undefined && {
        categoryId: payload.categoryId,
      }),
      ...(tutorId !== undefined && {
        tutorId: tutorId || null,
      }),
    },
    include: courseInclude,
  });
};

const deleteCourse = async (id: string, userId: string, role: string) => {
  const course = await db.course.findUnique({ where: { id } });
  if (!course) throw new Error("Course not found");

  if (role !== "ADMIN" && course.createdById !== userId) {
    throw new Error("You can only delete your own courses");
  }

  await db.course.delete({ where: { id } });
  return { message: "Course deleted successfully" };
};

const togglePopular = async (id: string, isPopular: boolean) => {
  const course = await db.course.findUnique({ where: { id } });
  if (!course) throw new Error("Course not found");

  return db.course.update({
    where: { id },
    data: { isPopular },
    include: courseInclude,
  });
};

export const CourseService = {
  getAllCourses,
  getSingleCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  togglePopular,
};
