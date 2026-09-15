import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const schedules = await prisma.schedule.findMany({
  where: {
    schoolId: "cmty5sueh0000s298kiaxhsq3",
  },
  select: {
    id: true,
    schoolId: true,
    academicYearId: true,
    classId: true,
    teacherId: true,
    subject: true,
    dayOfWeek: true,
    startTime: true,
    endTime: true,
    room: true,
  },
});

console.log(JSON.stringify(schedules, null, 2));

await prisma.$disconnect();
