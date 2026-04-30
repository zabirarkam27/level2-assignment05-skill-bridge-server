import { prisma } from "../../lib/prisma";
import { UpdateProfilePayload } from "./user.validation";

const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      tutorProfile: {
        select: {
          id: true,
          bio: true,
          subjects: true,
          rating: true,
          price: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const updateProfile = async (userId: string, payload: UpdateProfilePayload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return await prisma.user.update({
    where: { id: userId },
    data: {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.image !== undefined && { image: payload.image }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  });
};

export const UserService = {
  getCurrentUser,
  updateProfile,
};