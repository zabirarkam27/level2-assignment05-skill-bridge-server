import { prisma } from "../lib/prisma";

async function seedAdmin() {
  try {
    console.log("Seeding admin...");

    const adminEmail = "admin@skillbridge.com";

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      console.log("Admin already exists");
      return;
    }

    const admin = await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        emailVerified: true,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    console.log("Admin seeded successfully:", admin);
  } catch (error) {
    console.log("Error seeding admin", error);
  }
}

seedAdmin();