import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate.js";

const medicalUpdateSchema = z.object({
  bloodGroup: z.string().trim().max(20).optional().nullable(),
  temperature: z.coerce.number().min(30).max(45).optional().nullable(),
  weightKg: z.coerce.number().min(1).max(300).optional().nullable(),
  bloodPressureSystolic: z.coerce.number().int().min(50).max(250).optional().nullable(),
  bloodPressureDiastolic: z.coerce.number().int().min(30).max(180).optional().nullable(),
  allergies: z.string().trim().max(4000).optional().nullable(),
  medicalConditions: z.string().trim().max(4000).optional().nullable(),
  medications: z.string().trim().max(4000).optional().nullable(),
  emergencyContactName: z.string().trim().max(200).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(80).optional().nullable(),
  doctorName: z.string().trim().max(200).optional().nullable(),
  doctorPhone: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(6000).optional().nullable(),
});

import { canAccessTarget, getMedicalAccess } from "../authorization/medical-access.js";

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
    "/dashboard",
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

      const [
        totalStudents, studentRecords, totalAdults, adultRecords,
        studentAllergies, studentConditions, adultAllergies, adultConditions,
        recentChanges,
      ] = await Promise.all([
        fastify.prisma.user.count({
          where: { schoolId, role: "STUDENT", status: "ACTIVE" },
        }),
        fastify.prisma.studentMedicalRecord.count({
          where: { student: { schoolId, user: { status: "ACTIVE" } } },
        }),
        fastify.prisma.user.count({
          where: {
            schoolId,
            status: "ACTIVE",
            OR: [{ role: "TEACHER" }, { role: "STAFF" }],
          },
        }),
        fastify.prisma.adultMedicalRecord.count({
          where: {
            user: {
              schoolId,
              status: "ACTIVE",
              OR: [{ role: "TEACHER" }, { role: "STAFF" }],
            },
          },
        }),
        fastify.prisma.studentMedicalRecord.count({
          where: {
            student: { schoolId, user: { status: "ACTIVE" } },
            allergies: { not: null },
          },
        }),
        fastify.prisma.studentMedicalRecord.count({
          where: {
            student: { schoolId, user: { status: "ACTIVE" } },
            medicalConditions: { not: null },
          },
        }),
        fastify.prisma.adultMedicalRecord.count({
          where: {
            user: {
              schoolId,
              status: "ACTIVE",
              OR: [{ role: "TEACHER" }, { role: "STAFF" }],
            },
            allergies: { not: null },
          },
        }),
        fastify.prisma.adultMedicalRecord.count({
          where: {
            user: {
              schoolId,
              status: "ACTIVE",
              OR: [{ role: "TEACHER" }, { role: "STAFF" }],
            },
            medicalConditions: { not: null },
          },
        }),
        fastify.prisma.medicalHistory.count({
          where: {
            target: { schoolId },
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      const totalPeople = totalStudents + totalAdults;
      const completedRecords = studentRecords + adultRecords;

      return {
        access,
        scope: { schoolId },
        people: {
          students: totalStudents,
          adults: totalAdults,
          total: totalPeople,
        },
        records: {
          completed: completedRecords,
          missing: Math.max(0, totalPeople - completedRecords),
          completionRate:
            totalPeople > 0
              ? Math.round((completedRecords / totalPeople) * 100)
              : 100,
        },
        vigilance: {
          allergies: studentAllergies + adultAllergies,
          medicalConditions: studentConditions + adultConditions,
        },
        recentChanges,
      };
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


  const medicalEventSchema = z.object({
    targetUserId: z.string().min(1),
    type: z.enum(["CONSULTATION", "MEDICAL_VISIT", "FOLLOW_UP", "MEDICATION", "VIGILANCE"]),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional().nullable(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime().optional().nullable(),
    status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]).default("PLANNED"),
    priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).default("NORMAL"),
    notes: z.string().trim().max(6000).optional().nullable(),
  });

  fastify.get(
    "/calendar",
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
            code: "MEDICAL_CALENDAR_ACCESS_DENIED",
            message: access.reason ?? "Accès au calendrier médical refusé.",
          },
        });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(400).send({
          error: { code: "SCHOOL_REQUIRED", message: "Un établissement est requis." },
        });
      }

      const query = request.query as { start?: string; end?: string };
      const now = new Date();
      const start = query.start ? new Date(query.start) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const end = query.end ? new Date(query.end) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        return reply.status(400).send({
          error: { code: "INVALID_DATE_RANGE", message: "Période de calendrier invalide." },
        });
      }

      const events = await fastify.prisma.medicalEvent.findMany({
        where: {
          schoolId,
          startAt: { gte: start, lt: end },
        },
        include: {
          target: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              studentProfile: { select: { id: true, studentNumber: true } },
            },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { startAt: "asc" },
      });

      return { events };
    },
  );

  fastify.post(
    "/calendar",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const access = await getMedicalAccess(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
      );

      if (!access.allowed || access.mode !== "FULL" || !request.user.schoolId) {
        return reply.status(403).send({
          error: {
            code: "MEDICAL_CALENDAR_WRITE_DENIED",
            message: access.reason ?? "Création d'un suivi médical refusée.",
          },
        });
      }

      const parsed = medicalEventSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Données du suivi médical invalides.",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const data = parsed.data;
      const startAt = new Date(data.startAt);
      const endAt = data.endAt ? new Date(data.endAt) : null;

      if (endAt && endAt <= startAt) {
        return reply.status(400).send({
          error: { code: "INVALID_EVENT_TIME", message: "La fin doit être postérieure au début." },
        });
      }

      const { target } = await canAccessTarget(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId,
        data.targetUserId,
      );

      if (!target) {
        return reply.status(403).send({
          error: { code: "TARGET_ACCESS_DENIED", message: "La personne ciblée n'est pas accessible." },
        });
      }

      const event = await fastify.prisma.medicalEvent.create({
        data: {
          schoolId: request.user.schoolId,
          targetUserId: data.targetUserId,
          createdByUserId: request.user.sub,
          type: data.type,
          title: data.title,
          description: data.description ?? null,
          startAt,
          endAt,
          status: data.status,
          priority: data.priority,
          notes: data.notes ?? null,
        },
      });

      return reply.status(201).send({ event });
    },
  );

  fastify.patch(
    "/calendar/:eventId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const access = await getMedicalAccess(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
      );

      if (!access.allowed || access.mode !== "FULL" || !request.user.schoolId) {
        return reply.status(403).send({
          error: {
            code: "MEDICAL_CALENDAR_WRITE_DENIED",
            message: access.reason ?? "Modification du calendrier médical refusée.",
          },
        });
      }

      const { eventId } = request.params as { eventId: string };
      const existing = await fastify.prisma.medicalEvent.findFirst({
        where: { id: eventId, schoolId: request.user.schoolId },
      });

      if (!existing) {
        return reply.status(404).send({
          error: { code: "EVENT_NOT_FOUND", message: "Suivi médical introuvable." },
        });
      }

      const partialSchema = medicalEventSchema.partial();
      const parsed = partialSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Données du suivi médical invalides.",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const data = parsed.data;
      if (data.targetUserId) {
        const { target } = await canAccessTarget(
          fastify,
          request.user.sub,
          request.user.role,
          request.user.schoolId,
          data.targetUserId,
        );
        if (!target) {
          return reply.status(403).send({
            error: { code: "TARGET_ACCESS_DENIED", message: "La personne ciblée n'est pas accessible." },
          });
        }
      }

      const startAt = data.startAt ? new Date(data.startAt) : existing.startAt;
      const endAt = data.endAt === undefined ? existing.endAt : data.endAt ? new Date(data.endAt) : null;

      if (endAt && endAt <= startAt) {
        return reply.status(400).send({
          error: { code: "INVALID_EVENT_TIME", message: "La fin doit être postérieure au début." },
        });
      }

      const event = await fastify.prisma.medicalEvent.update({
        where: { id: eventId },
        data: {
          ...(data.targetUserId !== undefined ? { targetUserId: data.targetUserId } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.startAt !== undefined ? { startAt } : {}),
          ...(data.endAt !== undefined ? { endAt } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.priority !== undefined ? { priority: data.priority } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
      });

      return { event };
    },
  );

  fastify.delete(
    "/calendar/:eventId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const access = await getMedicalAccess(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
      );

      if (!access.allowed || access.mode !== "FULL" || !request.user.schoolId) {
        return reply.status(403).send({
          error: {
            code: "MEDICAL_CALENDAR_WRITE_DENIED",
            message: access.reason ?? "Suppression du calendrier médical refusée.",
          },
        });
      }

      const { eventId } = request.params as { eventId: string };
      const existing = await fastify.prisma.medicalEvent.findFirst({
        where: { id: eventId, schoolId: request.user.schoolId },
      });

      if (!existing) {
        return reply.status(404).send({
          error: { code: "EVENT_NOT_FOUND", message: "Suivi médical introuvable." },
        });
      }

      await fastify.prisma.medicalEvent.delete({ where: { id: eventId } });
      return { success: true };
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

      const medicalData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      ) as {
        bloodGroup?: string | null;
        temperature?: number | null;
        weightKg?: number | null;
        bloodPressureSystolic?: number | null;
        bloodPressureDiastolic?: number | null;
        allergies?: string | null;
        medicalConditions?: string | null;
        medications?: string | null;
        emergencyContactName?: string | null;
        emergencyContactPhone?: string | null;
        doctorName?: string | null;
        doctorPhone?: string | null;
        notes?: string | null;
      };

      const fieldEntries = Object.entries(medicalData);

      if (target.studentId) {
        const result = await fastify.prisma.$transaction(async (tx) => {
          const previous = await tx.studentMedicalRecord.findUnique({
            where: { studentId: target.studentId! },
          });
          const record = await tx.studentMedicalRecord.upsert({
            where: { studentId: target.studentId! },
            create: { studentId: target.studentId!, ...medicalData },
            update: medicalData,
          });
          const action = previous ? "UPDATED" : "CREATED";
          const history = fieldEntries
            .filter(([field, value]) => !previous || !Object.is(previous[field as keyof typeof previous], value))
            .map(([field, value]) => ({
              targetUserId: userId,
              actorUserId: request.user.sub,
              action,
              field,
              previousValue: previous ? String(previous[field as keyof typeof previous] ?? "") : null,
              newValue: value === null ? null : String(value),
            }));
          if (history.length > 0) {
            await tx.medicalHistory.createMany({ data: history });
          }
          return { record, historyCount: history.length };
        });
        return { record: result.record, recordType: "STUDENT", historyCount: result.historyCount };
      }

      const result = await fastify.prisma.$transaction(async (tx) => {
        const previous = await tx.adultMedicalRecord.findUnique({
          where: { userId },
        });
        const record = await tx.adultMedicalRecord.upsert({
          where: { userId },
          create: { userId, ...medicalData },
          update: medicalData,
        });
        const action = previous ? "UPDATED" : "CREATED";
        const history = fieldEntries
          .filter(([field, value]) => !previous || !Object.is(previous[field as keyof typeof previous], value))
          .map(([field, value]) => ({
            targetUserId: userId,
            actorUserId: request.user.sub,
            action,
            field,
            previousValue: previous ? String(previous[field as keyof typeof previous] ?? "") : null,
            newValue: value === null ? null : String(value),
          }));
        if (history.length > 0) {
          await tx.medicalHistory.createMany({ data: history });
        }
        return { record, historyCount: history.length };
      });
      return { record: result.record, recordType: "ADULT", historyCount: result.historyCount };
    },
  );
};

export default medicalRoutes;
