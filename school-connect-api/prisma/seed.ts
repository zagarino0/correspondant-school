import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const school = await prisma.school.upsert({
    where: {
      code: "SC-DEMO",
    },
    update: {
      name: "Demo School Connect",
      status: "ACTIVE",
    },
    create: {
      code: "SC-DEMO",
      name: "Demo School Connect",
      status: "ACTIVE",
    },
  });

  const users = [
    {
      email: "superadmin@school-connect.local",
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
      schoolId: null,
    },
    {
      email: "admin@school-connect.local",
      firstName: "School",
      lastName: "Admin",
      role: UserRole.SCHOOL_ADMIN,
      schoolId: school.id,
    },
    {
      email: "teacher@school-connect.local",
      firstName: "Demo",
      lastName: "Teacher",
      role: UserRole.TEACHER,
      schoolId: school.id,
    },
    {
      email: "parent@school-connect.local",
      firstName: "Demo",
      lastName: "Parent",
      role: UserRole.PARENT,
      schoolId: school.id,
    },
    {
      email: "staff@school-connect.local",
      firstName: "Demo",
      lastName: "Staff",
      role: UserRole.STAFF,
      schoolId: school.id,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        status: "ACTIVE",
        passwordHash,
      },
      create: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        status: "ACTIVE",
        passwordHash,
      },
    });
  }

  console.log("Seed completed successfully.");
  console.log(`School: ${school.code} - ${school.name}`);
  console.log(`Development password: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });