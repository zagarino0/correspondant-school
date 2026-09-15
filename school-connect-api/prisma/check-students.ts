import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    orderBy: [
      { schoolId: "asc" },
      { lastName: "asc" },
      { firstName: "asc" },
    ],
    select: {
      id: true,
      schoolId: true,
      studentNumber: true,
      firstName: true,
      lastName: true,
    },
  });

  console.table(students);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });