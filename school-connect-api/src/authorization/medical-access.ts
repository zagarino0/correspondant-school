import type { FastifyInstance } from "fastify";

type MedicalAccess = {
  allowed: boolean;
  role: string;
  mode: "FULL" | "PARENT";
  reason?: string;
};

async function getMedicalAccess(
  fastify: FastifyInstance,
  userId: string,
  role: string,
  schoolId: string | null,
): Promise<MedicalAccess> {
  if (role === "STAFF") {
    const staff = await fastify.prisma.staffProfile.findUnique({
      where: { userId },
      select: {
        function: true,
        user: { select: { status: true, schoolId: true } },
        assignments: {
          where: { active: true },
          select: { schoolId: true },
        },
      },
    });

    const allowed =
      staff?.function === "INFIRMIER" &&
      staff.user.status === "ACTIVE" &&
      !!schoolId &&
      staff.assignments.some((assignment) => assignment.schoolId === schoolId);

    return {
      allowed,
      role,
      mode: "FULL",
      ...(allowed
        ? {}
        : { reason: "Accès réservé au personnel infirmier actif." }),
    };
  }

  if (role === "SCHOOL_ADMIN") {
    if (!schoolId) {
      return {
        allowed: false,
        role,
        mode: "FULL",
        reason: "Aucun établissement associé.",
      };
    }

    const medicalStaff = await fastify.prisma.staffAssignment.count({
      where: {
        schoolId,
        active: true,
        staff: {
          function: "INFIRMIER",
          user: { status: "ACTIVE" },
        },
      },
    });

    return {
      allowed: medicalStaff === 0,
      role,
      mode: "FULL",
      ...(medicalStaff === 0
        ? {}
        : {
            reason:
              "Un infirmier actif est affecté à cet établissement. La gestion médicale lui est réservée.",
          }),
    };
  }

  if (role === "PARENT") {
    return {
      allowed: true,
      role,
      mode: "PARENT",
    };
  }

  return {
    allowed: false,
    role,
    mode: "FULL",
    reason: "Ce rôle n'a pas accès aux données médicales.",
  };
}

async function canAccessTarget(
  fastify: FastifyInstance,
  requesterId: string,
  requesterRole: string,
  requesterSchoolId: string | null,
  targetUserId: string,
): Promise<{ access: MedicalAccess; target: { id: string; role: string; schoolId: string | null; studentId: string | null } | null }> {
  const access = await getMedicalAccess(
    fastify,
    requesterId,
    requesterRole,
    requesterSchoolId,
  );

  const target = await fastify.prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
      schoolId: true,
      studentProfile: { select: { id: true } },
    },
  });

  if (!target) {
    return { access, target: null };
  }

  if (access.allowed && access.mode === "FULL") {
    if (!requesterSchoolId || target.schoolId !== requesterSchoolId) {
      return {
        access: {
          ...access,
          allowed: false,
          reason: "La fiche appartient à un autre établissement.",
        },
        target: null,
      };
    }

    if (!["TEACHER", "STAFF", "STUDENT"].includes(target.role)) {
      return {
        access: {
          ...access,
          allowed: false,
          reason: "Cette fiche n'est pas un dossier médical géré par le module.",
        },
        target: null,
      };
    }

    return {
      access,
      target: {
        id: target.id,
        role: target.role,
        schoolId: target.schoolId,
        studentId: target.studentProfile?.id ?? null,
      },
    };
  }

  if (requesterRole === "PARENT") {
    const relation = target.studentProfile
      ? await fastify.prisma.parentStudent.findFirst({
          where: {
            parentId: requesterId,
            studentId: target.studentProfile.id,
          },
          select: { id: true },
        })
      : null;

    if (!relation) {
      return {
        access: {
          ...access,
          allowed: false,
          reason: "Cette fiche ne correspond pas à l'un de vos enfants.",
        },
        target: null,
      };
    }

    return {
      access,
      target: {
        id: target.id,
        role: target.role,
        schoolId: target.schoolId,
        studentId: target.studentProfile?.id ?? null,
      },
    };
  }

  return { access, target: null };
}

