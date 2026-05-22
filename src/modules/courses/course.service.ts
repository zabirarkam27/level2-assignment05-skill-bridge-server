import { prisma } from "../../lib/prisma";
import { CourseDeleteRequestStatus } from "@prisma/client";
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
      role: true,
      status: true,
      tutorProfile: {
        select: {
          id: true,
        },
      },
    },
  },
  deleteRequests: {
    where: { status: CourseDeleteRequestStatus.PENDING },
    select: {
      id: true,
      requesterId: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

const db = prisma as any;

const ensureTutorHasCategory = async (
  tutorId: string,
  categoryId: string,
) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });

  if (!category) throw new Error("Category not found");

  const tutor = await prisma.user.findUnique({
    where: { id: tutorId },
    include: {
      tutorProfile: {
        select: {
          id: true,
          subjects: true,
          categories: {
            where: { categoryId: category.id },
            select: { categoryId: true },
          },
        },
      },
    },
  });

  if (
    !tutor ||
    tutor.role !== "TUTOR" ||
    tutor.status !== "ACTIVE" ||
    !tutor.tutorProfile
  ) {
    throw new Error("Invalid tutor selected");
  }

  if (tutor.tutorProfile.categories.length === 0) {
    await prisma.tutorCategory.createMany({
      data: {
        tutorId: tutor.tutorProfile.id,
        categoryId: category.id,
      },
      skipDuplicates: true,
    });
  }

  if (!tutor.tutorProfile.subjects.includes(category.name)) {
    await prisma.tutorProfile.update({
      where: { id: tutor.tutorProfile.id },
      data: {
        subjects: [...tutor.tutorProfile.subjects, category.name],
      },
    });
  }

  return { tutor, category };
};

export interface CourseFilters {
  popular?: boolean;
  categoryId?: string;
  createdById?: string;
  tutorId?: string;
  mineUserId?: string;
  mineRole?: string;
}

const getAllCourses = async (filters: CourseFilters = {}) => {
  return db.course.findMany({
    where: {
      ...(filters.popular && { isPopular: true }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.createdById && { createdById: filters.createdById }),
      ...(filters.tutorId && { tutorId: filters.tutorId }),
      ...(filters.mineUserId &&
        filters.mineRole === "TUTOR" && {
          tutorId: filters.mineUserId,
        }),
      ...(filters.mineUserId &&
        filters.mineRole === "ADMIN" && {
          createdById: filters.mineUserId,
        }),
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
  role: string,
  payload: CreateCoursePayload,
) => {
  const tutorId = role === "ADMIN" ? payload.tutorId : createdById;

  if (!tutorId) {
    throw new Error("Please select a tutor for this course");
  }

  await ensureTutorHasCategory(tutorId, payload.categoryId);

  return db.course.create({
    data: {
      title: payload.title,
      description: payload.description || null,
      image: payload.image || null,
      categoryId: payload.categoryId,
      createdById,
      tutorId,
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

  if (role !== "ADMIN" && payload.tutorId !== undefined) {
    throw new Error("Only admins can reassign course tutors");
  }

  if (role !== "ADMIN" && course.tutorId !== userId) {
    throw new Error("You can only edit courses assigned to you");
  }

  const tutorId = payload.tutorId;
  const nextTutorId = tutorId ?? course.tutorId;
  const nextCategoryId = payload.categoryId ?? course.categoryId;

  if (!nextTutorId) {
    throw new Error("Please select a tutor for this course");
  }

  await ensureTutorHasCategory(nextTutorId, nextCategoryId);

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
        tutorId,
      }),
    },
    include: courseInclude,
  });
};

const deleteCourse = async (id: string, userId: string, role: string) => {
  const course = await db.course.findUnique({ where: { id } });
  if (!course) throw new Error("Course not found");

  if (role !== "ADMIN") {
    throw new Error("Tutors must request admin approval to delete courses");
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { courseId: id },
      data: { courseId: null },
    });
    await tx.course.delete({ where: { id } });
  });

  return { message: "Course deleted successfully" };
};

const requestCourseDelete = async (
  id: string,
  requesterId: string,
  role: string,
) => {
  const course = await db.course.findUnique({
    where: { id },
    include: {
      deleteRequests: {
        where: {
          requesterId,
          status: CourseDeleteRequestStatus.PENDING,
        },
      },
    },
  });

  if (!course) throw new Error("Course not found");

  if (role !== "TUTOR" || course.tutorId !== requesterId) {
    throw new Error("You can only request deletion for courses assigned to you");
  }

  if (course.deleteRequests.length > 0) {
    return {
      message: "Delete request is already pending admin approval",
      data: course.deleteRequests[0],
    };
  }

  const request = await prisma.courseDeleteRequest.create({
    data: {
      courseId: id,
      requesterId,
    },
    include: {
      course: { include: courseInclude },
      requester: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return {
    message: "Delete request sent to admin for approval",
    data: request,
  };
};

const getDeleteRequests = async () => {
  return prisma.courseDeleteRequest.findMany({
    where: { status: CourseDeleteRequestStatus.PENDING },
    include: {
      course: { include: courseInclude },
      requester: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const resolveDeleteRequest = async (
  requestId: string,
  adminId: string,
  action: "APPROVED" | "REJECTED",
) => {
  const request = await prisma.courseDeleteRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error("Delete request not found");

  if (request.status !== CourseDeleteRequestStatus.PENDING) {
    throw new Error("Delete request has already been resolved");
  }

  if (action === "REJECTED") {
    return prisma.courseDeleteRequest.update({
      where: { id: requestId },
      data: {
        status: CourseDeleteRequestStatus.REJECTED,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { courseId: request.courseId },
      data: { courseId: null },
    });

    const resolved = await tx.courseDeleteRequest.update({
      where: { id: requestId },
      data: {
        status: CourseDeleteRequestStatus.APPROVED,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    });

    await tx.course.delete({ where: { id: request.courseId } });
    return resolved;
  });
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
  requestCourseDelete,
  getDeleteRequests,
  resolveDeleteRequest,
  togglePopular,
};
