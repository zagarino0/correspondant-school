import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const classes = await prisma.schoolClass.findMany({
    where: {
      schoolId: "cmty5sueh0000s298kiaxhsq3",
    },
    select: {
      id: true,
      name: true,
      schoolId: true,
      academicYearId: true,
    },
  });

  console.log(JSON.stringify(classes, null, 2));
} finally {
  await prisma.$disconnect();
}
