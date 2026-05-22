import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

const normalizeSubjects = (subjects: string[]) =>
  Array.from(new Set(subjects.map((subject) => subject.trim()).filter(Boolean)));

export const getValidCategorySubjects = async (
  tx: TxClient,
  subjects: string[],
) => {
  const normalizedSubjects = normalizeSubjects(subjects);

  if (normalizedSubjects.length === 0) {
    return [];
  }

  const categories = await tx.category.findMany({
    where: { name: { in: normalizedSubjects } },
    select: { id: true, name: true },
  });

  const categoryNames = new Set(categories.map((category) => category.name));

  return normalizedSubjects.filter((subject) => categoryNames.has(subject));
};

export const syncTutorCategories = async (
  tx: TxClient,
  tutorId: string,
  subjects: string[],
) => {
  const validSubjects = await getValidCategorySubjects(tx, subjects);

  await tx.tutorCategory.deleteMany({
    where: { tutorId },
  });

  if (validSubjects.length === 0) {
    return validSubjects;
  }

  const categories = await tx.category.findMany({
    where: { name: { in: validSubjects } },
    select: { id: true },
  });

  await tx.tutorCategory.createMany({
    data: categories.map((category) => ({
      tutorId,
      categoryId: category.id,
    })),
    skipDuplicates: true,
  });

  return validSubjects;
};
