import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const years = await prisma.academicYear.findMany({
    where: {
      schoolId: "cmty5sueh0000s298kiaxhsq3",
    },
    select: {
      id: true,
      name: true,
      schoolId: true,
      startDate: true,
      endDate: true,
    },
  });

  console.log(JSON.stringify(years, null, 2));
} finally {
  await prisma.$disconnect();
}
