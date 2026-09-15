import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const teachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      schoolId: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  console.log(JSON.stringify(teachers, null, 2));
} finally {
  await prisma.$disconnect();
}
