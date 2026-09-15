import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const school2 = await prisma.school.findUnique({
    where: {
      id: "cmty5sueh0000s298kiaxhsq3",
    },
  });

  if (!school2) {
    throw new Error("School 2 not found.");
  }

  const passwordHash = await bcrypt.hash(
    "Password123!",
    10
  );

  const user = await prisma.user.create({
    data: {
      schoolId: school2.id,
      email: "student.c@school-connect.local",
      passwordHash,
      firstName: "Student",
      lastName: "C",
      role: UserRole.STUDENT,
    },
  });

  const student = await prisma.student.create({
    data: {
      schoolId: school2.id,
      userId: user.id,
      studentNumber: "STU-S2-001",
      firstName: "Student",
      lastName: "C",
    },
  });

  console.log("Student C created:");
  console.log({
    userId: user.id,
    studentId: student.id,
    schoolId: school2.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  