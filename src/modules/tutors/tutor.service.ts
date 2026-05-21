import { prisma } from "../../lib/prisma";
import { CreateTutorPayload, UpdateTutorPayload } from "./tutor.types";

const createTutor = async (userId: string, payload: CreateTutorPayload) => {
  const isExist = await prisma.tutorProfile.findUnique({
    where: { userId },
  });

  if (isExist) {
    throw new Error("Tutor profile already exists");
  }

  const result = await prisma.tutorProfile.create({
    data: {
      userId,
      bio: payload.bio,
      subjects: payload.subjects,
      price: payload.price,
    },
  });

  return result;
};

const updateTutor = async (userId: string, payload: UpdateTutorPayload) => {
  const updateData = {
    ...(payload.bio !== undefined && {
      bio: payload.bio,
    }),

    ...(payload.subjects !== undefined && {
      subjects: payload.subjects,
    }),

    ...(payload.price !== undefined && {
      price: payload.price,
    }),
  };

  const result = await prisma.tutorProfile.upsert({
    where: { userId },

    update: updateData,

    create: {
      userId,

      bio: payload.bio ?? "",

      subjects: payload.subjects ?? [],

      price: payload.price ?? 0,
    },
  });

  return result;
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
  return await prisma.tutorProfile.findUnique({
    where: { id },

    include: {
      user: true,
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
