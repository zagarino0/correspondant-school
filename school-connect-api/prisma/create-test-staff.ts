import { PrismaClient, StaffFunction, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SCHOOL_ID = "cmtxl4wbh0000s2r4xq278ajs";

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const user = await prisma.user.upsert({
    where: {
      email: "surveillant@school-connect.local",
    },
    update: {
      firstName: "Demo",
      lastName: "Surveillant",
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      schoolId: SCHOOL_ID,
      passwordHash,
    },
    create: {
      email: "surveillant@school-connect.local",
      passwordHash,
      firstName: "Demo",
      lastName: "Surveillant",
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      schoolId: SCHOOL_ID,
    },
  });

  const staffProfile = await prisma.staffProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {
      function: StaffFunction.SURVEILLANT,
    },
    create: {
      userId: user.id,
      function: StaffFunction.SURVEILLANT,
    },
  });

  const existingAssignment = await prisma.staffAssignment.findFirst({
    where: {
      staffId: staffProfile.id,
      schoolId: SCHOOL_ID,
    },
  });

  const assignment =
    existingAssignment ??
    (await prisma.staffAssignment.create({
      data: {
        staffId: staffProfile.id,
        schoolId: SCHOOL_ID,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        active: true,
      },
    }));

  console.log("Staff de test créé/vérifié :");
  console.log("--------------------------------");
  console.log("User ID       :", user.id);
  console.log("Email         :", user.email);
  console.log("Role          :", user.role);
  console.log("School ID     :", user.schoolId);
  console.log("Staff ID      :", staffProfile.id);
  console.log("Function      :", staffProfile.function);
  console.log("Assignment ID :", assignment.id);
  console.log("Active        :", assignment.active);
  console.log("--------------------------------");
  console.log("Password      : Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });