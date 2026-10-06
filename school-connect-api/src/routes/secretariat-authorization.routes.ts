import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const secretariatAuthorizationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/secretariat/authorizations",
    { onRequest: [authenticate, authorize("authorization.read")] },
    async (request, reply) => {
      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
      }

      const authorizations = await fastify.prisma.parentAuthorization.findMany({
        where: { schoolId },
        orderBy: { requestedAt: "desc" },
        take: 200,
        select: {
          id: true, schoolId: true, studentId: true, parentId: true, type: true,
          status: true, reason: true, requestedAt: true, decidedAt: true,
          student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
          parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      });

      return reply.send({ authorizations });
    },
  );

  fastify.post(
    "/secretariat/authorizations",
    { onRequest: [authenticate, authorize("authorization.create")] },
    async (request, reply) => {
      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
      }

      const parsed = z.object({
        studentId: z.string().min(1),
        parentId: z.string().min(1),
        type: z.string().trim().min(1).max(100),
        reason: z.string().trim().max(2000).optional(),
      }).safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid authorization data.", details: parsed.error.flatten().fieldErrors } });
      }

      const relation = await fastify.prisma.parentStudent.findFirst({
        where: {
          studentId: parsed.data.studentId,
          parentId: parsed.data.parentId,
          student: { schoolId },
        },
        select: { id: true },
      });

      if (!relation) {
        return reply.status(404).send({
          error: { code: "PARENT_STUDENT_NOT_FOUND", message: "This parent is not linked to this student in the school." },
        });
      }

      const authorization = await fastify.prisma.parentAuthorization.create({
        data: {
          schoolId,
          studentId: parsed.data.studentId,
          parentId: parsed.data.parentId,
          type: parsed.data.type,
          reason: parsed.data.reason ?? null,
          status: "PENDING",
        },
        select: {
          id: true, schoolId: true, studentId: true, parentId: true, type: true,
          status: true, reason: true, requestedAt: true, decidedAt: true,
          student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
          parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      });

      return reply.status(201).send({ authorization });
    },
  );

  fastify.patch(
    "/secretariat/authorizations/:authorizationId",
    { onRequest: [authenticate, authorize("authorization.update")] },
    async (request, reply) => {
      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
      }

      const { authorizationId } = request.params as { authorizationId: string };
      const parsed = z.object({
        type: z.string().trim().min(1).max(100).optional(),
        reason: z.string().trim().max(2000).nullable().optional(),
      }).safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid authorization update.", details: parsed.error.flatten().fieldErrors } });
      }

      const existing = await fastify.prisma.parentAuthorization.findFirst({
        where: { id: authorizationId, schoolId },
        select: { id: true, status: true },
      });

      if (!existing) {
        return reply.status(404).send({ error: { code: "AUTHORIZATION_NOT_FOUND", message: "Authorization request not found." } });
      }

      if (existing.status !== "PENDING") {
        return reply.status(409).send({ error: { code: "AUTHORIZATION_ALREADY_DECIDED", message: "A decided authorization cannot be administratively modified." } });
      }

      const authorization = await fastify.prisma.parentAuthorization.update({
        where: { id: authorizationId },
        data: {
          ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
          ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
        },
        select: {
          id: true, schoolId: true, studentId: true, parentId: true, type: true,
          status: true, reason: true, requestedAt: true, decidedAt: true,
          student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
          parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      });

      return reply.send({ authorization });
    },
  );
};

export default secretariatAuthorizationRoutes;
