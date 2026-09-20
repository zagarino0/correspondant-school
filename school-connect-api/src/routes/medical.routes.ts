import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate.js";

const medicalUpdateSchema = z.object({
  bloodGroup: z.string().trim().max(20).optional().nullable(),
  allergies: z.string().trim().max(4000).optional().nullable(),
  medicalConditions: z.string().trim().max(4000).optional().nullable(),
  medications: z.string().trim().max(4000).optional().nullable(),
  emergencyContactName: z.string().trim().max(200).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(80).optional().nullable(),
  doctorName: z.string().trim().max(200).optional().nullable(),
  doctorPhone: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(6000).optional().nullable(),
});

type MedicalAccess = {
  allowed: boolean;
  role: string;
  mode: "FULL" | "PARENT";
  reason?: string;
};

async function getMedicalAccess(
  fastify: Parameters<FastifyPluginAsync>[0],
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
      staff.assignments.length > 0;

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
  fastify: Parameters<FastifyPluginAsync>[0],
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

export const medicalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/access",
    { onRequest: [authenticate] },
    async (request) => {
      return getMedicalAccess(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
      );
    },
  );

  fastify.get(
    "/people",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const access = await getMedicalAccess(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
      );

      if (!access.allowed || access.mode !== "FULL") {
        return reply.status(403).send({
          error: {
            code: "MEDICAL_ACCESS_DENIED",
            message: access.reason ?? "Accès médical refusé.",
          },
        });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(400).send({
          error: {
            code: "SCHOOL_REQUIRED",
            message: "Un établissement est requis.",
          },
        });
      }

      const users = await fastify.prisma.user.findMany({
        where: {
          schoolId,
          status: "ACTIVE",
          OR: [
            { role: "TEACHER" },
            { role: "STAFF" },
            { role: "STUDENT" },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          studentProfile: {
            select: {
              id: true,
              studentNumber: true,
            },
          },
          staffProfile: {
            select: { function: true },
          },
        },
        orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      });

      return {
        people: users.map((user) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          studentId: user.studentProfile?.id ?? null,
          studentNumber: user.studentProfile?.studentNumber ?? null,
          function: user.staffProfile?.function ?? null,
        })),
      };
    },
  );

  fastify.get(
    "/my-children",
    { onRequest: [authenticate] },
    async (request, reply) => {
      if (request.user.role !== "PARENT") {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Parent access required.",
          },
        });
      }

      const children = await fastify.prisma.parentStudent.findMany({
        where: { parentId: request.user.sub },
        select: {
          student: {
            select: {
              userId: true,
              id: true,
              firstName: true,
              lastName: true,
              studentNumber: true,
              dateOfBirth: true,
              gender: true,
              schoolId: true,
            },
          },
          relationship: true,
          isPrimary: true,
        },
        orderBy: [
          { isPrimary: "desc" },
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
      });

      return {
        children: children.map((item) => ({
          userId: item.student.userId,
          studentId: item.student.id,
          firstName: item.student.firstName,
          lastName: item.student.lastName,
          studentNumber: item.student.studentNumber,
          dateOfBirth: item.student.dateOfBirth,
          gender: item.student.gender,
          schoolId: item.student.schoolId,
          relationship: item.relationship,
          isPrimary: item.isPrimary,
        })),
      };
    },
  );

  fastify.get(
    "/:userId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const { access, target } = await canAccessTarget(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
        userId,
      );

      if (!target) {
        return reply.status(403).send({
          error: {
            code: "MEDICAL_ACCESS_DENIED",
            message: access.reason ?? "Accès médical refusé.",
          },
        });
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          schoolId: true,
          studentProfile: {
            select: {
              id: true,
              studentNumber: true,
              dateOfBirth: true,
              gender: true,
              status: true,
            },
          },
          staffProfile: {
            select: { function: true },
          },
        },
      });

      if (!user) {
        return reply.status(404).send({
          error: {
            code: "USER_NOT_FOUND",
            message: "Personne introuvable.",
          },
        });
      }

      const studentRecord = user.studentProfile
        ? await fastify.prisma.studentMedicalRecord.findUnique({
            where: { studentId: user.studentProfile.id },
          })
        : null;

      const adultRecord = !user.studentProfile
        ? await fastify.prisma.adultMedicalRecord.findUnique({
            where: { userId },
          })
        : null;

      return {
        access,
        person: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          schoolId: user.schoolId,
          student: user.studentProfile,
          function: user.staffProfile?.function ?? null,
        },
        record: studentRecord ?? adultRecord,
        recordType: user.studentProfile ? "STUDENT" : "ADULT",
      };
    },
  );

  fastify.patch(
    "/:userId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const { access, target } = await canAccessTarget(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
        userId,
      );

      if (!target || !access.allowed || access.mode !== "FULL") {
        return reply.status(403).send({
          error: {
            code: "MEDICAL_WRITE_DENIED",
            message: access.reason ?? "La modification médicale est réservée au personnel autorisé.",
          },
        });
      }

      const parsed = medicalUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Données médicales invalides.",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const data = parsed.data;

      if (target.studentId) {
        const record = await fastify.prisma.studentMedicalRecord.upsert({
          where: { studentId: target.studentId },
          create: {
            studentId: target.studentId,
            ...data,
          },
          update: data,
        });

        return { record, recordType: "STUDENT" };
      }

      const record = await fastify.prisma.adultMedicalRecord.upsert({
        where: { userId },
        create: {
          userId,
          ...data,
        },
        update: data,
      });

      return { record, recordType: "ADULT" };
    },
  );
};

export default medicalRoutes;
