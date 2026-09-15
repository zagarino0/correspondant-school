import { PrismaClient, ScheduleDay } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const schedule = await prisma.schedule.create({
    data: {
      schoolId: "cmtxl4wbh0000s2r4xq278ajs",
      academicYearId: "cmtygiqje0001s2l02cvht1l7",
      classId: "cmtygiqko0003s2l0zjiyipmf",
      teacherId: "cmtxl4whe0006s2r4aje51959",
      subject: "DELETE TEST",
      dayOfWeek: ScheduleDay.SUNDAY,
      startTime: "13:00",
      endTime: "14:00",
      room: "DELETE TEST",
    },
    select: {
      id: true,
      subject: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      room: true,
    },
  });

  console.log(JSON.stringify(schedule, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
