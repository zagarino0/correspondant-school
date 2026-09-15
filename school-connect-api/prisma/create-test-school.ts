import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const school = await prisma.school.upsert({
    where: {
      code: "SC-TEST-02",
    },
    update: {},
    create: {
      code: "SC-TEST-02",
      name: "Test School 2",
      status: "ACTIVE",
    },
  });

  const user = await prisma.user.upsert({
    where: {
      email: "admin2@school-connect.local",
    },
    update: {
      schoolId: school.id,
      role: "SCHOOL_ADMIN",
      status: "ACTIVE",
    },
    create: {
      email: "admin2@school-connect.local",
      passwordHash,
      firstName: "Second",
      lastName: "Admin",
      role: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId: school.id,
    },
  });

  console.log("SCHOOL 2:", school.id);
  console.log("USER 2:", user.id);
  console.log("EMAIL:", user.email);
  console.log("ROLE:", user.role);
  console.log("SCHOOL ID:", user.schoolId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });