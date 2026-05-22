import { prisma } from "../../lib/prisma";
import {
  getValidCategorySubjects,
  syncTutorCategories,
} from "../../utils/tutorCategorySync";
import { CreateTutorPayload, UpdateTutorPayload } from "./tutor.types";

const createTutor = async (userId: string, payload: CreateTutorPayload) => {
  return await prisma.$transaction(async (tx) => {
    const isExist = await tx.tutorProfile.findUnique({
      where: { userId },
    });

    if (isExist) {
      throw new Error("Tutor profile already exists");
    }

    const validSubjects = await getValidCategorySubjects(tx, payload.subjects);

    if (validSubjects.length === 0) {
      throw new Error("Select at least one valid category as a subject");
    }

    const result = await tx.tutorProfile.create({
      data: {
        userId,
        bio: payload.bio,
        subjects: validSubjects,
        price: payload.price,
      },
    });

    await syncTutorCategories(tx, result.id, validSubjects);

    return result;
  });
};

const updateTutor = async (userId: string, payload: UpdateTutorPayload) => {
  return await prisma.$transaction(async (tx) => {
    const validSubjects =
      payload.subjects !== undefined
        ? await getValidCategorySubjects(tx, payload.subjects)
        : undefined;

    if (payload.subjects !== undefined && validSubjects?.length === 0) {
      throw new Error("Select at least one valid category as a subject");
    }

    const updateData = {
      ...(payload.bio !== undefined && {
        bio: payload.bio,
      }),

      ...(validSubjects !== undefined && {
        subjects: validSubjects,
      }),

      ...(payload.price !== undefined && {
        price: payload.price,
      }),
    };

    const result = await tx.tutorProfile.upsert({
      where: { userId },

      update: updateData,

      create: {
        userId,

        bio: payload.bio ?? "",

        subjects: validSubjects ?? [],

        price: payload.price ?? 0,
      },
    });

    if (validSubjects !== undefined) {
      await syncTutorCategories(tx, result.id, validSubjects);
    }

    return result;
  });
};

const getTutorProfileByUserId = async (userId: string) => {
  return await prisma.tutorProfile.findUnique({
    where: { userId },

    include: {
      user: true,
      reviews: true,
      availabilities: true,
    },
  });
};

export interface TutorFilters {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  categoryId?: string;
}

const getAllTutors = async (filters: TutorFilters = {}) => {
  const { search, minPrice, maxPrice, minRating, categoryId } = filters;

  return await prisma.tutorProfile.findMany({
    where: {
      user: {
        role: "TUTOR",
        status: "ACTIVE",
      },
      ...(search && {
        OR: [
          {
            subjects: {
              hasSome: [search],
            },
          },

          {
            bio: {
              contains: search,
              mode: "insensitive",
            },
          },

          {
            user: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        ],
      }),

      ...(minPrice !== undefined && {
        price: {
          gte: minPrice,
        },
      }),

      ...(maxPrice !== undefined && {
        price: {
          lte: maxPrice,
        },
      }),

      ...(minRating !== undefined && {
        rating: {
          gte: minRating,
        },
      }),

      ...(categoryId && {
        categories: {
          some: {
            categoryId,
          },
        },
      }),
    },

    include: {
      user: true,
      reviews: true,
    },

    orderBy: {
      rating: "desc",
    },
  });
};

const getSingleTutor = async (id: string) => {
  return await prisma.tutorProfile.findFirst({
    where: { id, user: { role: "TUTOR", status: "ACTIVE" } },

    include: {
      user: {
        include: {
          assignedCourses: {
            include: {
              category: {
                select: { id: true, name: true, description: true, image: true },
              },
              tutor: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                  status: true,
                  tutorProfile: {
                    select: { id: true },
                  },
                },
              },
              createdBy: {
                select: { id: true, name: true, image: true, role: true },
              },
            },
            orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }],
          },
        },
      },
      reviews: true,
      availabilities: true,
    },
  });
};

export const TutorService = {
  createTutor,
  updateTutor,
  getTutorProfileByUserId,
  getAllTutors,
  getSingleTutor,
};
