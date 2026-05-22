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
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!existing) {
      throw new Error("Category not found");
    }

    const updated = await tx.category.update({
      where: { id },
      data: payload,
    });

    if (payload.name && payload.name !== existing.name) {
      const tutorProfiles = await tx.tutorProfile.findMany({
        where: { subjects: { has: existing.name } },
        select: { id: true, subjects: true },
      });

      await Promise.all(
        tutorProfiles.map((profile) =>
          tx.tutorProfile.update({
            where: { id: profile.id },
            data: {
              subjects: profile.subjects.map((subject) =>
                subject === existing.name ? payload.name! : subject,
              ),
            },
          }),
        ),
      );
    }

    return updated;
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

  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    const deleted = await tx.category.delete({
      where: { id },
    });

    const tutorProfiles = await tx.tutorProfile.findMany({
      where: { subjects: { has: category.name } },
      select: { id: true, subjects: true },
    });

    await Promise.all(
      tutorProfiles.map((profile) =>
        tx.tutorProfile.update({
          where: { id: profile.id },
          data: {
            subjects: profile.subjects.filter(
              (subject) => subject !== category.name,
            ),
          },
        }),
      ),
    );

    return deleted;
  });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory
};
