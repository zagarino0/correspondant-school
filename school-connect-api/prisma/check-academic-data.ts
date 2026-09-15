import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.user.findUnique({
    where: {
      id: "cmtxl4whe0006s2r4aje51959",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      schoolId: true,

      teacherClassAssignments: {
        select: {
          class: {
            select: {
              id: true,
              name: true,
              level: true,

              academicYear: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },

              enrollments: {
                select: {
                  status: true,

                  student: {
                    select: {
                      id: true,
                      studentNumber: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found.");
  }

  console.dir(teacher, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });