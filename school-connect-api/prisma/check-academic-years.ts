import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const years = await prisma.academicYear.findMany({
    select: {
      id: true,
      name: true,
      schoolId: true,
      startDate: true,
      endDate: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  console.log(JSON.stringify(years, null, 2));
} finally {
  await prisma.$disconnect();
}
