import type { PrismaClient } from "@prisma/client";

export async function canParentAccessStudent(
  prisma: PrismaClient,
  parentId: string,
  studentId: string
): Promise<boolean> {
  const relation = await prisma.parentStudent.findUnique({
    where: {
      parentId_studentId: {
        parentId,
        studentId,
      },
    },
    select: {
      id: true,
    },
  });

  return relation !== null;
}