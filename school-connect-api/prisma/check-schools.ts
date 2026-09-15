import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  console.log(JSON.stringify(schools, null, 2));
} finally {
  await prisma.$disconnect();
}
