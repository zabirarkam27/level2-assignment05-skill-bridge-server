import { prisma } from "../../lib/prisma";

const createTutor = async (userId: string, payload: any) => {
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

const updateTutor = async (userId: string, payload: any) => {
  const result = await prisma.tutorProfile.update({
    where: { userId },
    data: payload,
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

const getAllTutors = async () => {
  return await prisma.tutorProfile.findMany({
    include: {
      user: true,
      reviews: true,
    },
    orderBy: {
      createdAt: "desc",
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