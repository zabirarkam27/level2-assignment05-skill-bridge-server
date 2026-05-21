import { prisma } from "../lib/prisma";

const DEFAULT_CATEGORIES = [
  {
    name: "Web Development",
    description: "Frontend, backend, and full-stack web technologies",
  },
  {
    name: "Mobile Development",
    description: "iOS, Android, and cross-platform mobile apps",
  },
  {
    name: "Data Science",
    description: "Analytics, machine learning foundations, and data engineering",
  },
  {
    name: "Cloud Computing",
    description: "AWS, Azure, GCP, DevOps, and cloud architecture",
  },
  {
    name: "Network & Cyber Security",
    description: "Networking, ethical hacking, and security operations",
  },
  {
    name: "Artificial Intelligence",
    description: "Deep learning, NLP, computer vision, and AI systems",
  },
  {
    name: "Product Management & Design",
    description: "UX/UI, product strategy, and design thinking",
  },
];

async function seedCategories() {
  try {
    console.log("Seeding course categories...");

    for (const category of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: { name: category.name },
        update: {
          description: category.description,
        },
        create: category,
      });
      console.log(`  ✓ ${category.name}`);
    }

    console.log("Category seeding complete.");
  } catch (error) {
    console.error("Category seed failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();
