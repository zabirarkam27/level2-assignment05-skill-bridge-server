import "dotenv/config";
import { prisma } from "../lib/prisma";
import { syncTutorCategories } from "../utils/tutorCategorySync";

async function main() {
  const tutorProfiles = await prisma.tutorProfile.findMany({
    select: {
      id: true,
      userId: true,
      subjects: true,
    },
  });

  let synced = 0;

  for (const profile of tutorProfiles) {
    await prisma.$transaction(async (tx) => {
      const validSubjects = await syncTutorCategories(
        tx,
        profile.id,
        profile.subjects,
      );

      if (validSubjects.length !== profile.subjects.length) {
        process.stdout.write(
          `Tutor ${profile.userId} has ${profile.subjects.length - validSubjects.length} subject value(s) without a matching category.\n`,
        );
      }
    });

    synced += 1;
  }

  process.stdout.write(
    `Synced TutorCategory relations for ${synced} tutor profile${synced === 1 ? "" : "s"}.\n`,
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
