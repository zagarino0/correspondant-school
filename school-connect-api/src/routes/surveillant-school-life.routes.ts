import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { authorizeStudentResource } from "../middleware/authorize-student-resource.js";
import { publishToUser } from "../realtime/message-events.js";

const exitTypeSchema = z.enum(["TEMPORARY", "PERMANENT"]);
const exitStatusSchema = z.enum(["OPEN", "COMPLETED", "CANCELLED"]);
const movementTypeSchema = z.enum(["ENTRY", "EXIT"]);
const incidentSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const disciplinaryStatusSchema = z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]);
const alertSeveritySchema = z.enum(["NORMAL", "IMPORTANT", "CRITICAL"]);

function parseDate(value: string | undefined, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getScheduleDayFromDate(date: Date) {
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ] as const;
  return days[date.getUTCDay()];
}

export async function surveillantSchoolLifeRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/students/:studentId/life-profile",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("student.read")],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };

      const student = await fastify.prisma.student.findFirst({
        where: {
          id: studentId,
          ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}),
        },
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
          status: true,
          parents: {
            select: {
              relationship: true,
              isPrimary: true,
              parent: { select: { id: true, firstName: true, lastName: true, phone: true } },
            },
          },
          enrollments: {
            where: { status: "ACTIVE" },
            select: {
              class: { select: { id: true, name: true, level: true } },
              academicYear: { select: { id: true, name: true } },
            },
            take: 1,
          },
          attendances: {
            orderBy: { date: "desc" },
            take: 20,
            select: { id: true, date: true, status: true, arrivalTime: true, reason: true, note: true },
          },
          studentExits: {
            orderBy: { exitAt: "desc" },
            take: 20,
            select: {
              id: true, type: true, status: true, authorizedPersonName: true,
              authorizedPersonPhone: true, reason: true, exitAt: true, returnAt: true,
            },
          },
          studentMovements: {
            orderBy: { occurredAt: "desc" },
            take: 20,
            select: { id: true, type: true, reason: true, occurredAt: true },
          },
          incidents: {
            orderBy: { occurredAt: "desc" },
            take: 20,
            select: { id: true, type: true, severity: true, description: true, occurredAt: true },
          },
          disciplinaryActions: {
            orderBy: { actionAt: "desc" },
            take: 20,
            select: { id: true, incidentId: true, type: true, status: true, description: true, actionAt: true },
          },
          schoolLifeObservations: {
            orderBy: { observedAt: "desc" },
            take: 20,
            select: { id: true, content: true, observedAt: true, createdAt: true },
          },
          parentAuthorizations: {
            orderBy: { requestedAt: "desc" },
            take: 20,
            select: { id: true, parentId: true, type: true, status: true, reason: true, requestedAt: true, decidedAt: true },
          },
          parentSummons: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, parentId: true, reason: true, status: true, scheduledAt: true, createdAt: true },
          },
        },
      });

      if (!student) {
        return reply.status(404).send({
          error: { code: "STUDENT_NOT_FOUND", message: "Student not found." },
        });
      }

      return reply.send({ student });
    },
  );

  fastify.get(
    "/exits",
    {
      onRequest: [authenticate],
      preHandler: [authorize("student-exit.read")],
    },
    async (request, reply) => {
      const query = request.query as {
        studentId?: string;
        date?: string;
        status?: string;
        type?: string;
      };
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const date = parseDate(query.date);
      if (query.date && !date) return reply.status(400).send({ error: { code: "INVALID_DATE", message: "The date is invalid." } });

      const where = {
        schoolId,
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.status && exitStatusSchema.safeParse(query.status).success ? { status: query.status as "OPEN" | "COMPLETED" | "CANCELLED" } : {}),
        ...(query.type && exitTypeSchema.safeParse(query.type).success ? { type: query.type as "TEMPORARY" | "PERMANENT" } : {}),
        ...(query.date ? { exitAt: { gte: dayRange(date!).start, lt: dayRange(date!).end } } : {}),
      };

      const items = await fastify.prisma.studentExit.findMany({
        where,
        orderBy: { exitAt: "desc" },
        take: 100,
        select: {
          id: true, studentId: true, type: true, status: true,
          authorizedPersonName: true, authorizedPersonPhone: true,
          reason: true, exitAt: true, returnAt: true, recordedBy: true,
          student: { select: { firstName: true, lastName: true, studentNumber: true } },
        },
      });

      return reply.send({ items });
    },
  );

  fastify.post(
    "/students/:studentId/exits",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("student-exit.create")],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const parsed = z.object({
        type: exitTypeSchema,
        authorizedPersonName: z.string().trim().min(2).max(150),
        authorizedPersonPhone: z.string().trim().max(30).nullable().optional(),
        reason: z.string().trim().min(1).max(500),
        exitAt: z.string().datetime().optional(),
        returnAt: z.string().datetime().nullable().optional(),
      }).safeParse(request.body);

      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid student exit." } });

      const student = await fastify.prisma.student.findFirst({
        where: { id: studentId, ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}) },
        select: { id: true, schoolId: true },
      });
      if (!student) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found." } });

      const exitAt = new Date(parsed.data.exitAt ?? new Date().toISOString());
      const returnAt = parsed.data.returnAt ? new Date(parsed.data.returnAt) : null;
      if (returnAt && returnAt < exitAt) return reply.status(400).send({ error: { code: "INVALID_RETURN_TIME", message: "Return time cannot precede exit time." } });

      const item = await fastify.prisma.studentExit.create({
        data: {
          schoolId: student.schoolId,
          studentId,
          type: parsed.data.type,
          status: returnAt || parsed.data.type === "PERMANENT" ? "COMPLETED" : "OPEN",
          authorizedPersonName: parsed.data.authorizedPersonName,
          authorizedPersonPhone: parsed.data.authorizedPersonPhone ?? null,
          reason: parsed.data.reason,
          exitAt,
          returnAt,
          recordedBy: request.user.sub,
        },
      });

      return reply.status(201).send({ item });
    },
  );

  fastify.patch(
    "/students/:studentId/exits/:exitId",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("student-exit.update")],
    },
    async (request, reply) => {
      const { studentId, exitId } = request.params as { studentId: string; exitId: string };
      const parsed = z.object({
        status: exitStatusSchema.optional(),
        returnAt: z.string().datetime().nullable().optional(),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid exit update." } });

      const existing = await fastify.prisma.studentExit.findFirst({ where: { id: exitId, studentId, ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}) } });
      if (!existing) return reply.status(404).send({ error: { code: "EXIT_NOT_FOUND", message: "Exit not found." } });

      const returnAt = parsed.data.returnAt === undefined ? undefined : parsed.data.returnAt ? new Date(parsed.data.returnAt) : null;
      const item = await fastify.prisma.studentExit.update({
        where: { id: exitId },
        data: {
          ...(parsed.data.status ? { status: parsed.data.status } : {}),
          ...(parsed.data.returnAt !== undefined && returnAt !== undefined ? { returnAt } : {}),
          ...(parsed.data.returnAt === null ? { returnAt: null } : {}),
        },
      });

      return reply.send({ item });
    },
  );

  fastify.get(
    "/movements",
    {
      onRequest: [authenticate],
      preHandler: [authorize("student-movement.read")],
    },
    async (request, reply) => {
      const query = request.query as { studentId?: string; date?: string };
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });
      const date = parseDate(query.date);
      if (query.date && !date) return reply.status(400).send({ error: { code: "INVALID_DATE", message: "The date is invalid." } });

      const items = await fastify.prisma.studentMovement.findMany({
        where: {
          schoolId,
          ...(query.studentId ? { studentId: query.studentId } : {}),
          ...(query.date ? { occurredAt: { gte: dayRange(date!).start, lt: dayRange(date!).end } } : {}),
        },
        orderBy: { occurredAt: "desc" },
        take: 100,
        select: {
          id: true, studentId: true, type: true, reason: true, occurredAt: true,
          student: { select: { firstName: true, lastName: true, studentNumber: true } },
        },
      });
      return reply.send({ items });
    },
  );

  fastify.post(
    "/students/:studentId/movements",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("student-movement.create")],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const parsed = z.object({
        type: movementTypeSchema,
        reason: z.string().trim().min(1).max(500),
        occurredAt: z.string().datetime().optional(),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid student movement." } });

      const student = await fastify.prisma.student.findFirst({ where: { id: studentId, ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}) }, select: { id: true, schoolId: true } });
      if (!student) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found." } });

      const item = await fastify.prisma.studentMovement.create({
        data: {
          schoolId: student.schoolId,
          studentId,
          type: parsed.data.type,
          reason: parsed.data.reason,
          occurredAt: new Date(parsed.data.occurredAt ?? new Date().toISOString()),
          recordedBy: request.user.sub,
        },
      });
      return reply.status(201).send({ item });
    },
  );



  fastify.patch(
    "/students/:studentId/movements/:movementId",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("student-movement.update")],
    },
    async (request, reply) => {
      const { studentId, movementId } = request.params as { studentId: string; movementId: string };
      const parsed = z.object({
        type: movementTypeSchema.optional(),
        reason: z.string().trim().min(1).max(500).optional(),
        occurredAt: z.string().datetime().optional(),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid movement update." } });

      const existing = await fastify.prisma.studentMovement.findFirst({
        where: { id: movementId, studentId, ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}) },
      });
      if (!existing) return reply.status(404).send({ error: { code: "MOVEMENT_NOT_FOUND", message: "Movement not found." } });

      const item = await fastify.prisma.studentMovement.update({
        where: { id: movementId },
        data: {
          ...(parsed.data.type ? { type: parsed.data.type } : {}),
          ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
          ...(parsed.data.occurredAt ? { occurredAt: new Date(parsed.data.occurredAt) } : {}),
        },
      });
      return reply.send({ item });
    },
  );

  fastify.get(
    "/incidents",
    {
      onRequest: [authenticate],
      preHandler: [authorize("incident.read")],
    },
    async (request, reply) => {
      const query = request.query as { studentId?: string; severity?: string };
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const items = await fastify.prisma.incident.findMany({
        where: {
          schoolId,
          ...(query.studentId ? { studentId: query.studentId } : {}),
          ...(query.severity && incidentSeveritySchema.safeParse(query.severity).success ? { severity: query.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" } : {}),
        },
        orderBy: { occurredAt: "desc" },
        take: 100,
        select: {
          id: true, studentId: true, type: true, severity: true, description: true, occurredAt: true, reportedBy: true,
          student: { select: { firstName: true, lastName: true, studentNumber: true } },
          actions: { orderBy: { actionAt: "desc" }, take: 10, select: { id: true, type: true, status: true, actionAt: true, description: true } },
        },
      });
      return reply.send({ items });
    },
  );

  fastify.post(
    "/students/:studentId/incidents",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("incident.create")],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const parsed = z.object({
        type: z.string().trim().min(1).max(100),
        severity: incidentSeveritySchema.default("MEDIUM"),
        description: z.string().trim().min(1).max(3000),
        occurredAt: z.string().datetime().optional(),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid incident." } });

      const student = await fastify.prisma.student.findFirst({ where: { id: studentId, ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}) }, select: { id: true, schoolId: true } });
      if (!student) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found." } });

      const item = await fastify.prisma.incident.create({
        data: {
          schoolId: student.schoolId,
          studentId,
          type: parsed.data.type,
          severity: parsed.data.severity,
          description: parsed.data.description,
          occurredAt: new Date(parsed.data.occurredAt ?? new Date().toISOString()),
          reportedBy: request.user.sub,
        },
      });
      return reply.status(201).send({ item });
    },
  );



  fastify.patch(
    "/students/:studentId/incidents/:incidentId",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("incident.update")],
    },
    async (request, reply) => {
      const { studentId, incidentId } = request.params as { studentId: string; incidentId: string };
      const parsed = z.object({
        type: z.string().trim().min(1).max(100).optional(),
        severity: incidentSeveritySchema.optional(),
        description: z.string().trim().min(1).max(3000).optional(),
        occurredAt: z.string().datetime().optional(),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid incident update." } });

      const existing = await fastify.prisma.incident.findFirst({
        where: { id: incidentId, studentId, ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}) },
      });
      if (!existing) return reply.status(404).send({ error: { code: "INCIDENT_NOT_FOUND", message: "Incident not found." } });

      const item = await fastify.prisma.incident.update({
        where: { id: incidentId },
        data: {
          ...(parsed.data.type ? { type: parsed.data.type } : {}),
          ...(parsed.data.severity ? { severity: parsed.data.severity } : {}),
          ...(parsed.data.description ? { description: parsed.data.description } : {}),
          ...(parsed.data.occurredAt ? { occurredAt: new Date(parsed.data.occurredAt) } : {}),
        },
      });
      return reply.send({ item });
    },
  );

  fastify.get(
    "/disciplinary-actions",
    {
      onRequest: [authenticate],
      preHandler: [authorize("disciplinary-action.read")],
    },
    async (request, reply) => {
      const query = request.query as { studentId?: string };
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const items = await fastify.prisma.disciplinaryAction.findMany({
        where: { schoolId, ...(query.studentId ? { studentId: query.studentId } : {}) },
        orderBy: { actionAt: "desc" },
        take: 100,
        select: {
          id: true, studentId: true, incidentId: true, type: true, status: true, description: true, actionAt: true, createdBy: true,
          student: { select: { firstName: true, lastName: true, studentNumber: true } },
        },
      });
      return reply.send({ items });
    },
  );

  fastify.post(
    "/students/:studentId/disciplinary-actions",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("disciplinary-action.create")],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const parsed = z.object({
        incidentId: z.string().nullable().optional(),
        type: z.string().trim().min(1).max(100),
        description: z.string().trim().min(1).max(3000),
        actionAt: z.string().datetime().optional(),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid disciplinary action." } });

      const student = await fastify.prisma.student.findFirst({ where: { id: studentId, ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}) }, select: { id: true, schoolId: true } });
      if (!student) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found." } });

      if (parsed.data.incidentId) {
        const incident = await fastify.prisma.incident.findFirst({ where: { id: parsed.data.incidentId, studentId, schoolId: student.schoolId }, select: { id: true } });
        if (!incident) return reply.status(400).send({ error: { code: "INCIDENT_NOT_FOUND", message: "Incident not found for this student." } });
      }

      const item = await fastify.prisma.disciplinaryAction.create({
        data: {
          schoolId: student.schoolId,
          studentId,
          incidentId: parsed.data.incidentId ?? null,
          type: parsed.data.type,
          description: parsed.data.description,
          actionAt: new Date(parsed.data.actionAt ?? new Date().toISOString()),
          createdBy: request.user.sub,
        },
      });
      return reply.status(201).send({ item });
    },
  );



  fastify.patch(
    "/students/:studentId/disciplinary-actions/:actionId",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("disciplinary-action.update")],
    },
    async (request, reply) => {
      const { studentId, actionId } = request.params as { studentId: string; actionId: string };
      const parsed = z.object({
        type: z.string().trim().min(1).max(100).optional(),
        status: disciplinaryStatusSchema.optional(),
        description: z.string().trim().min(1).max(3000).optional(),
        actionAt: z.string().datetime().optional(),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid disciplinary action update." } });

      const existing = await fastify.prisma.disciplinaryAction.findFirst({
        where: { id: actionId, studentId, ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}) },
      });
      if (!existing) return reply.status(404).send({ error: { code: "DISCIPLINARY_ACTION_NOT_FOUND", message: "Disciplinary action not found." } });

      const item = await fastify.prisma.disciplinaryAction.update({
        where: { id: actionId },
        data: {
          ...(parsed.data.type ? { type: parsed.data.type } : {}),
          ...(parsed.data.status ? { status: parsed.data.status } : {}),
          ...(parsed.data.description ? { description: parsed.data.description } : {}),
          ...(parsed.data.actionAt ? { actionAt: new Date(parsed.data.actionAt) } : {}),
        },
      });
      return reply.send({ item });
    },
  );

  fastify.get(
    "/observations",
    {
      onRequest: [authenticate],
      preHandler: [authorize("observation.read")],
    },
    async (request, reply) => {
      const query = request.query as { studentId?: string };
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const items = await fastify.prisma.schoolLifeObservation.findMany({
        where: { schoolId, ...(query.studentId ? { studentId: query.studentId } : {}) },
        orderBy: { observedAt: "desc" },
        take: 100,
        select: {
          id: true, studentId: true, content: true, observedAt: true, createdAt: true,
          student: { select: { firstName: true, lastName: true, studentNumber: true } },
        },
      });
      return reply.send({ items });
    },
  );

  fastify.post(
    "/students/:studentId/observations",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("observation.create")],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const parsed = z.object({
        content: z.string().trim().min(1).max(3000),
        observedAt: z.string().datetime().optional(),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid school-life observation." } });

      const student = await fastify.prisma.student.findFirst({ where: { id: studentId, ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}) }, select: { id: true, schoolId: true } });
      if (!student) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found." } });

      const item = await fastify.prisma.schoolLifeObservation.create({
        data: {
          schoolId: student.schoolId,
          studentId,
          content: parsed.data.content,
          observedAt: new Date(parsed.data.observedAt ?? new Date().toISOString()),
          createdBy: request.user.sub,
        },
      });
      return reply.status(201).send({ item });
    },
  );



  fastify.get(
    "/authorizations",
    {
      onRequest: [authenticate],
      preHandler: [authorize("authorization.read")],
    },
    async (request, reply) => {
      const query = request.query as { studentId?: string; status?: string };
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const items = await fastify.prisma.parentAuthorization.findMany({
        where: {
          schoolId,
          ...(query.studentId ? { studentId: query.studentId } : {}),
          ...(query.status && ["PENDING", "APPROVED", "REJECTED"].includes(query.status)
            ? { status: query.status as "PENDING" | "APPROVED" | "REJECTED" }
            : {}),
        },
        orderBy: { requestedAt: "desc" },
        take: 100,
        select: {
          id: true, studentId: true, parentId: true, type: true, status: true,
          reason: true, requestedAt: true, decidedAt: true,
          student: { select: { firstName: true, lastName: true, studentNumber: true } },
          parent: { select: { firstName: true, lastName: true, phone: true } },
        },
      });
      return reply.send({ items });
    },
  );

  fastify.get(
    "/alerts",
    {
      onRequest: [authenticate],
      preHandler: [authorize("alert.read")],
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const items = await fastify.prisma.alert.findMany({
        where: {
          schoolId,
          OR: [
            { recipientId: request.user.sub },
            { createdBy: request.user.sub },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, studentId: true, recipientId: true, severity: true, title: true,
          message: true, readAt: true, createdAt: true,
          student: { select: { firstName: true, lastName: true, studentNumber: true } },
        },
      });
      return reply.send({ items });
    },
  );

  fastify.post(
    "/alerts",
    {
      onRequest: [authenticate],
      preHandler: [authorize("alert.create")],
    },
    async (request, reply) => {
      const parsed = z.object({
        studentId: z.string().nullable().optional(),
        recipientId: z.string().nullable().optional(),
        severity: alertSeveritySchema.default("NORMAL"),
        title: z.string().trim().min(1).max(150),
        message: z.string().trim().min(1).max(2000),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid alert." } });

      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      if (parsed.data.studentId) {
        const student = await fastify.prisma.student.findFirst({ where: { id: parsed.data.studentId, schoolId }, select: { id: true } });
        if (!student) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found." } });
      }

      if (parsed.data.recipientId) {
        const recipient = await fastify.prisma.user.findFirst({ where: { id: parsed.data.recipientId, schoolId }, select: { id: true } });
        if (!recipient) return reply.status(404).send({ error: { code: "RECIPIENT_NOT_FOUND", message: "Recipient not found in this school." } });
      }

      const item = await fastify.prisma.alert.create({
        data: {
          schoolId,
          studentId: parsed.data.studentId ?? null,
          recipientId: parsed.data.recipientId ?? null,
          severity: parsed.data.severity,
          title: parsed.data.title,
          message: parsed.data.message,
          createdBy: request.user.sub,
        },
      });

      if (item.recipientId) publishToUser(item.recipientId, "school-life:alert", item);
      return reply.status(201).send({ item });
    },
  );

  fastify.get(
    "/daily-reports",
    {
      onRequest: [authenticate],
      preHandler: [authorize("daily-report.read")],
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const items = await fastify.prisma.dailyReport.findMany({
        where: { schoolId },
        orderBy: { reportDate: "desc" },
        take: 60,
        select: {
          id: true, reportDate: true, summary: true, absences: true, lates: true,
          incidents: true, exits: true, movements: true, createdBy: true, createdAt: true,
        },
      });
      return reply.send({ items });
    },
  );

  fastify.post(
    "/daily-reports",
    {
      onRequest: [authenticate],
      preHandler: [authorize("daily-report.create")],
    },
    async (request, reply) => {
      const parsed = z.object({
        reportDate: z.string().datetime().optional(),
        summary: z.string().trim().min(1).max(5000),
      }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid daily report." } });

      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const reportDate = new Date(parsed.data.reportDate ?? new Date().toISOString());
      const { start, end } = dayRange(reportDate);

      const [absences, lates, incidents, exits, movements] = await Promise.all([
        fastify.prisma.attendance.count({ where: { date: { gte: start, lt: end }, status: "ABSENT", student: { schoolId } } }),
        fastify.prisma.attendance.count({ where: { date: { gte: start, lt: end }, status: "LATE", student: { schoolId } } }),
        fastify.prisma.incident.count({ where: { schoolId, occurredAt: { gte: start, lt: end } } }),
        fastify.prisma.studentExit.count({ where: { schoolId, exitAt: { gte: start, lt: end } } }),
        fastify.prisma.studentMovement.count({ where: { schoolId, occurredAt: { gte: start, lt: end } } }),
      ]);

      const item = await fastify.prisma.dailyReport.upsert({
        where: { schoolId_reportDate: { schoolId, reportDate: start } },
        create: {
          schoolId,
          reportDate: start,
          summary: parsed.data.summary,
          absences,
          lates,
          incidents,
          exits,
          movements,
          createdBy: request.user.sub,
        },
        update: {
          summary: parsed.data.summary,
          absences,
          lates,
          incidents,
          exits,
          movements,
        },
      });

      return reply.status(201).send({ item });
    },
  );
  fastify.get(
    "/attendance/session",
    {
      onRequest: [authenticate],
      preHandler: [authorize("attendance.read")],
    },
    async (request, reply) => {
      const query = request.query as { scheduleId?: string; date?: string };
      const { scheduleId, date } = query;

      if (!scheduleId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({
          error: {
            code: "INVALID_ATTENDANCE_SESSION",
            message: "scheduleId et date (YYYY-MM-DD) sont requis.",
          },
        });
      }

      const sessionDate = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(sessionDate.getTime())) {
        return reply.status(400).send({
          error: { code: "INVALID_DATE", message: "La date est invalide." },
        });
      }

      const nextDate = new Date(sessionDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({
          error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." },
        });
      }

      const schedule = await fastify.prisma.schedule.findFirst({
        where: {
          id: scheduleId,
          schoolId,
          academicYear: { status: "ACTIVE", schoolId },
        },
        select: {
          id: true,
          classId: true,
          subject: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
          class: { select: { id: true, name: true, level: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!schedule) {
        return reply.status(404).send({
          error: { code: "SCHEDULE_NOT_FOUND", message: "Créneau introuvable." },
        });
      }

      if (schedule.dayOfWeek !== getScheduleDayFromDate(sessionDate)) {
        return reply.status(400).send({
          error: {
            code: "SCHEDULE_DATE_MISMATCH",
            message: "Le créneau sélectionné n'est pas prévu ce jour-là.",
          },
        });
      }

      const enrollments = await fastify.prisma.studentEnrollment.findMany({
        where: {
          classId: schedule.classId,
          status: "ACTIVE",
          academicYear: { status: "ACTIVE", schoolId },
          student: { schoolId, status: "ACTIVE" },
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
        select: {
          id: true,
          studentId: true,
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const attendances = await fastify.prisma.attendance.findMany({
        where: {
          scheduleId,
          date: { gte: sessionDate, lt: nextDate },
          studentId: { in: enrollments.map((item) => item.studentId) },
        },
        select: {
          id: true,
          studentId: true,
          status: true,
          arrivalTime: true,
          reason: true,
          note: true,
          recordedBy: true,
          updatedAt: true,
        },
      });

      const attendanceByStudent = new Map(
        attendances.map((item) => [item.studentId, item]),
      );

      return reply.send({
        date,
        schedule,
        students: enrollments.map((enrollment) => ({
          enrollmentId: enrollment.id,
          ...enrollment.student,
          attendance: attendanceByStudent.get(enrollment.studentId) ?? null,
        })),
      });
    },
  );

  fastify.post(
    "/attendance/session",
    {
      onRequest: [authenticate],
      preHandler: [authorize("attendance.update")],
    },
    async (request, reply) => {
      const parsed = z.object({
        scheduleId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        records: z.array(
          z.object({
            studentId: z.string().min(1),
            status: z.enum(["PRESENT", "ABSENT", "LATE"]),
            arrivalTime: z.string().datetime().nullable().optional(),
            reason: z.string().trim().max(500).nullable().optional(),
            note: z.string().trim().max(1000).nullable().optional(),
          }),
        ).min(1),
      }).safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Les données de présence sont invalides.",
          },
        });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({
          error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." },
        });
      }

      const sessionDate = new Date(`${parsed.data.date}T00:00:00.000Z`);
      const nextDate = new Date(sessionDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      const schedule = await fastify.prisma.schedule.findFirst({
        where: {
          id: parsed.data.scheduleId,
          schoolId,
          academicYear: { status: "ACTIVE", schoolId },
        },
        select: { id: true, classId: true, schoolId: true },
      });

      if (!schedule) {
        return reply.status(404).send({
          error: { code: "SCHEDULE_NOT_FOUND", message: "Créneau introuvable." },
        });
      }

      if (schedule.dayOfWeek !== getScheduleDayFromDate(sessionDate)) {
        return reply.status(400).send({
          error: {
            code: "SCHEDULE_DATE_MISMATCH",
            message: "Le créneau sélectionné n'est pas prévu ce jour-là.",
          },
        });
      }

      const enrollments = await fastify.prisma.studentEnrollment.findMany({
        where: {
          classId: schedule.classId,
          status: "ACTIVE",
          academicYear: { status: "ACTIVE", schoolId },
          student: { schoolId, status: "ACTIVE" },
        },
        select: { id: true, studentId: true },
      });

      const enrollmentByStudent = new Map(
        enrollments.map((item) => [item.studentId, item]),
      );

      for (const record of parsed.data.records) {
        if (!enrollmentByStudent.has(record.studentId)) {
          return reply.status(400).send({
            error: {
              code: "STUDENT_NOT_IN_CLASS",
              message: `L'élève ${record.studentId} n'appartient pas à la classe de ce créneau.`,
            },
          });
        }
      }

      const saved = await fastify.prisma.$transaction(
        parsed.data.records.map((record) => {
          const enrollment = enrollmentByStudent.get(record.studentId)!;
          const sessionKey = `${parsed.data.scheduleId}:${parsed.data.date}:${record.studentId}`;
          const arrivalTime =
            record.arrivalTime === undefined || record.arrivalTime === null
              ? null
              : new Date(record.arrivalTime);

          return fastify.prisma.attendance.upsert({
            where: { sessionKey },
            create: {
              studentId: record.studentId,
              enrollmentId: enrollment.id,
              scheduleId: parsed.data.scheduleId,
              sessionKey,
              date: sessionDate,
              status: record.status,
              arrivalTime,
              reason: record.reason ?? null,
              note: record.note ?? null,
              recordedBy: request.user.sub,
            },
            update: {
              status: record.status,
              arrivalTime,
              reason: record.reason ?? null,
              note: record.note ?? null,
              recordedBy: request.user.sub,
              date: sessionDate,
              scheduleId: parsed.data.scheduleId,
            },
          });
        }),
      );

      return reply.status(200).send({
        date: parsed.data.date,
        scheduleId: parsed.data.scheduleId,
        count: saved.length,
        attendances: saved,
      });
    },
  );


  /**
   * Le surveillant ne modifie jamais le pointage P/A du teacher.
   * Il peut uniquement transformer un pointage existant en RETARD
   * et enregistrer l'heure d'arrivée ainsi que le motif.
   */
  fastify.post(
    "/attendance/session/late",
    {
      onRequest: [authenticate],
      preHandler: [authorize("attendance-late.create")],
    },
    async (request, reply) => {
      const parsed = z.object({
        scheduleId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        studentId: z.string().min(1),
        arrivalTime: z.string().datetime(),
        reason: z.string().trim().max(500).nullable().optional(),
        note: z.string().trim().max(1000).nullable().optional(),
      }).safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Les données du retard sont invalides.",
          },
        });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({
          error: {
            code: "SCHOOL_REQUIRED",
            message: "A school assignment is required.",
          },
        });
      }

      const sessionDate = new Date(`${parsed.data.date}T00:00:00.000Z`);
      const nextDate = new Date(sessionDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      const arrivalTime = new Date(parsed.data.arrivalTime);
      if (arrivalTime < sessionDate || arrivalTime >= nextDate) {
        return reply.status(400).send({
          error: {
            code: "INVALID_ARRIVAL_TIME",
            message: "L'heure d'arrivée doit appartenir à la date du pointage.",
          },
        });
      }

      const schedule = await fastify.prisma.schedule.findFirst({
        where: {
          id: parsed.data.scheduleId,
          schoolId,
          academicYear: { status: "ACTIVE", schoolId },
        },
        select: {
          id: true,
          classId: true,
          schoolId: true,
          dayOfWeek: true,
        },
      });

      if (!schedule) {
        return reply.status(404).send({
          error: {
            code: "SCHEDULE_NOT_FOUND",
            message: "Créneau introuvable.",
          },
        });
      }

      if (schedule.dayOfWeek !== getScheduleDayFromDate(sessionDate)) {
        return reply.status(400).send({
          error: {
            code: "SCHEDULE_DATE_MISMATCH",
            message: "Le créneau sélectionné n'est pas prévu ce jour-là.",
          },
        });
      }

      const enrollment = await fastify.prisma.studentEnrollment.findFirst({
        where: {
          studentId: parsed.data.studentId,
          classId: schedule.classId,
          status: "ACTIVE",
          academicYear: { status: "ACTIVE", schoolId },
          student: { schoolId, status: "ACTIVE" },
        },
        select: {
          id: true,
          studentId: true,
        },
      });

      if (!enrollment) {
        return reply.status(404).send({
          error: {
            code: "STUDENT_NOT_IN_CLASS",
            message: "L'élève n'appartient pas à la classe de ce créneau.",
          },
        });
      }

      const attendance = await fastify.prisma.attendance.findFirst({
        where: {
          scheduleId: parsed.data.scheduleId,
          studentId: parsed.data.studentId,
          date: { gte: sessionDate, lt: nextDate },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!attendance) {
        return reply.status(409).send({
          error: {
            code: "TEACHER_ATTENDANCE_REQUIRED",
            message: "Le pointage du teacher doit être enregistré avant de déclarer un retard.",
          },
        });
      }

      const updated = await fastify.prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          status: "LATE",
          arrivalTime,
          reason: parsed.data.reason ?? null,
          note: parsed.data.note ?? null,
          recordedBy: request.user.sub,
        },
      });

      return reply.send({
        item: updated,
        rule: "SURVEILLANT_LATE_ONLY",
      });
    },
  );


  /**
   * Le surveillant peut corriger uniquement les données d'un RETARD
   * déjà enregistré. Il ne peut jamais rétablir P/A.
   */
  fastify.patch(
    "/attendance/session/late/:attendanceId",
    {
      onRequest: [authenticate],
      preHandler: [authorize("attendance-late.update")],
    },
    async (request, reply) => {
      const { attendanceId } = request.params as { attendanceId: string };
      const parsed = z.object({
        arrivalTime: z.string().datetime().optional(),
        reason: z.string().trim().max(500).nullable().optional(),
        note: z.string().trim().max(1000).nullable().optional(),
      }).safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Les données du retard sont invalides.",
          },
        });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({
          error: {
            code: "SCHOOL_REQUIRED",
            message: "A school assignment is required.",
          },
        });
      }

      const attendance = await fastify.prisma.attendance.findFirst({
        where: {
          id: attendanceId,
          status: "LATE",
          scheduleId: { not: null },
          student: { schoolId },
        },
        select: {
          id: true,
          date: true,
          scheduleId: true,
        },
      });

      if (!attendance) {
        return reply.status(404).send({
          error: {
            code: "LATE_ATTENDANCE_NOT_FOUND",
            message: "Retard introuvable.",
          },
        });
      }

      const arrivalTime =
        parsed.data.arrivalTime === undefined
          ? undefined
          : new Date(parsed.data.arrivalTime);

      if (arrivalTime && (
        arrivalTime < attendance.date ||
        arrivalTime >= new Date(attendance.date.getTime() + 24 * 60 * 60 * 1000)
      )) {
        return reply.status(400).send({
          error: {
            code: "INVALID_ARRIVAL_TIME",
            message: "L'heure d'arrivée doit appartenir à la date du pointage.",
          },
        });
      }

      const updated = await fastify.prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          ...(arrivalTime !== undefined ? { arrivalTime } : {}),
          ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
          ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
          recordedBy: request.user.sub,
          status: "LATE",
        },
      });

      return reply.send({
        item: updated,
        rule: "SURVEILLANT_LATE_ONLY",
      });
    },
  );

}
