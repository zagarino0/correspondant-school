import { describe, expect, it, vi } from "vitest";

import { canMessageUser } from "../src/authorization/message-access.js";

type MockUser = {
  id: string;
  role:
    | "SUPER_ADMIN"
    | "SCHOOL_ADMIN"
    | "TEACHER"
    | "PARENT"
    | "STUDENT"
    | "STAFF";
  schoolId: string | null;
  status: "ACTIVE" | "INACTIVE";
};

type MockPrisma = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  student: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  teacherClass: {
    findMany: ReturnType<typeof vi.fn>;
  };
  parentStudent: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const schoolA = "school-a";
const schoolB = "school-b";

const users: MockUser[] = [
  {
    id: "super-admin",
    role: "SUPER_ADMIN",
    schoolId: null,
    status: "ACTIVE",
  },
  {
    id: "admin-a",
    role: "SCHOOL_ADMIN",
    schoolId: schoolA,
    status: "ACTIVE",
  },
  {
    id: "admin-b",
    role: "SCHOOL_ADMIN",
    schoolId: schoolB,
    status: "ACTIVE",
  },
  {
    id: "teacher-a",
    role: "TEACHER",
    schoolId: schoolA,
    status: "ACTIVE",
  },
  {
    id: "teacher-b",
    role: "TEACHER",
    schoolId: schoolB,
    status: "ACTIVE",
  },
  {
    id: "student-a",
    role: "STUDENT",
    schoolId: schoolA,
    status: "ACTIVE",
  },
  {
    id: "student-b",
    role: "STUDENT",
    schoolId: schoolA,
    status: "ACTIVE",
  },
  {
    id: "student-b-class",
    role: "STUDENT",
    schoolId: schoolA,
    status: "ACTIVE",
  },
  {
    id: "parent-a",
    role: "PARENT",
    schoolId: schoolA,
    status: "ACTIVE",
  },
  {
    id: "parent-unrelated",
    role: "PARENT",
    schoolId: schoolA,
    status: "ACTIVE",
  },
  {
    id: "inactive-student",
    role: "STUDENT",
    schoolId: schoolA,
    status: "INACTIVE",
  },
  {
    id: "staff-a",
    role: "STAFF",
    schoolId: schoolA,
    status: "ACTIVE",
  },
];

const studentEnrollments: Record<string, string[]> = {
  "student-a": ["class-a"],
  "student-b": ["class-b"],
  "student-b-class": ["class-a"],
};

const teacherClasses: Record<string, string[]> = {
  "teacher-a": ["class-a"],
  "teacher-b": ["class-b"],
};

const parentChildren: Record<string, string[]> = {
  "parent-a": ["student-a"],
  "parent-unrelated": ["student-b"],
};

function createPrismaMock(): MockPrisma {
  const prisma: MockPrisma = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const user = users.find((item) => item.id === where.id);

        if (!user) {
          return null;
        }

        return {
          ...user,
          staffProfile: null,
        };
      }),
    },
    student: {
      findUnique: vi.fn(
        async ({ where }: { where: { userId: string } }) => {
          const enrollments = studentEnrollments[where.userId];

          if (!enrollments) {
            return null;
          }

          return {
            enrollments: enrollments.map((classId) => ({ classId })),
          };
        },
      ),
    },
    teacherClass: {
      findMany: vi.fn(
        async ({ where }: { where: { teacherId: string } }) => {
          return (teacherClasses[where.teacherId] ?? []).map((classId) => ({
            classId,
          }));
        },
      ),
    },
    parentStudent: {
      findMany: vi.fn(
        async ({ where }: { where: { parentId: string } }) => {
          return (parentChildren[where.parentId] ?? []).map((studentUserId) => ({
            student: {
              enrollments: (studentEnrollments[studentUserId] ?? []).map(
                (classId) => ({ classId }),
              ),
            },
          }));
        },
      ),
    },
  };

  return prisma;
}

describe("Message access", () => {
  it("autorise un SUPER_ADMIN à contacter un SCHOOL_ADMIN", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "super-admin",
        "admin-a",
      ),
    ).toBe(true);
  });

  it("refuse à un SUPER_ADMIN de contacter un autre rôle", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "super-admin",
        "teacher-a",
      ),
    ).toBe(false);
  });

  it("autorise un SCHOOL_ADMIN à contacter un utilisateur de son école", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "admin-a",
        "teacher-a",
      ),
    ).toBe(true);
  });

  it("refuse à un SCHOOL_ADMIN de contacter un utilisateur d'une autre école", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "admin-a",
        "teacher-b",
      ),
    ).toBe(false);
  });

  it("autorise un TEACHER à contacter un élève de sa classe", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "teacher-a",
        "student-a",
      ),
    ).toBe(true);
  });

  it("refuse à un TEACHER de contacter un élève d'une autre classe", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "teacher-a",
        "student-b",
      ),
    ).toBe(false);
  });

  it("autorise un TEACHER à contacter le parent d'un élève de sa classe", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "teacher-a",
        "parent-a",
      ),
    ).toBe(true);
  });

  it("autorise un PARENT à contacter l'enseignant de son enfant", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "parent-a",
        "teacher-a",
      ),
    ).toBe(true);
  });

  it("refuse à un PARENT de contacter un enseignant sans lien avec son enfant", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "parent-unrelated",
        "teacher-a",
      ),
    ).toBe(false);
  });

  it("autorise un STUDENT à contacter un enseignant de sa classe", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "student-a",
        "teacher-a",
      ),
    ).toBe(true);
  });

  it("refuse à un STUDENT de contacter un autre élève", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "student-a",
        "student-b-class",
      ),
    ).toBe(false);
  });

  it("refuse un utilisateur inactif", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "teacher-a",
        "inactive-student",
      ),
    ).toBe(false);
  });

  it("refuse l'auto-message", async () => {
    expect(
      await canMessageUser(
        createPrismaMock() as never,
        "student-a",
        "student-a",
      ),
    ).toBe(false);
  });
});
