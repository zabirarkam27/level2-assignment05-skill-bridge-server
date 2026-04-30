import { prisma } from "../../lib/prisma";

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  image?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  image?: string;
}

const createCategory = async (payload: CreateCategoryPayload) => {
  return prisma.category.create({
    data: payload,
  });
};

const getAllCategories = async () => {
  return prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  });
};

const getSingleCategory = async (id: string) => {
  return prisma.category.findUnique({
    where: { id },
  });
};

const updateCategory = async (id: string, payload: UpdateCategoryPayload) => {
  return prisma.category.update({
    where: { id },
    data: payload,
  });
};

const deleteCategory = async (id: string) => {
  return prisma.category.delete({
    where: { id },
  });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory
};
