import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const schoolId = "cmtxl4wbh0000s2r4xq278ajs";

async function main() {
  const academicYears = await prisma.academicYear.findMany({
    where: {
      schoolId,
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });

  console.log("\n=== ACADEMIC YEARS ===");
  console.table(academicYears);

  const classes = await prisma.schoolClass.findMany({
    where: {
      schoolId,
    },
    select: {
      id: true,
      name: true,
      academicYearId: true,
    },
  });

  console.log("\n=== CLASSES ===");
  console.table(classes);

  const teachers = await prisma.user.findMany({
    where: {
      schoolId,
      role: "TEACHER",
      status: "ACTIVE",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  console.log("\n=== TEACHERS ===");
  console.table(teachers);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });