import { prisma } from "../lib/prisma";
import { hashPassword } from "better-auth/crypto";

async function seedAdmin() {
  try {
    const adminEmail = "admin@skillbridge.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
    const hashedPassword = await hashPassword(adminPassword);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
      create: {
        name: "Admin",
        email: adminEmail,
        emailVerified: true,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    const existingCredentialAccount = await prisma.account.findFirst({
      where: {
        userId: admin.id,
        providerId: "credential",
      },
    });

    if (existingCredentialAccount) {
      await prisma.account.update({
        where: { id: existingCredentialAccount.id },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: admin.id,
          providerId: "credential",
          userId: admin.id,
          password: hashedPassword,
        },
      });
    }
  } catch {
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
