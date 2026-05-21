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
  const courseCount = await prisma.course.count({
    where: { categoryId: id },
  });

  if (courseCount > 0) {
    throw new Error(
      "Cannot delete a category that has courses. Remove or reassign courses first.",
    );
  }

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
