import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { authenticate } from "../middleware/authenticate.js";
import { canAccessTarget, getMedicalAccess } from "../authorization/medical-access.js";

const reportTypes = [
  "INFIRMARY_VISIT",
  "MEDICAL_INCIDENT",
  "CONSULTATION",
  "FOLLOW_UP",
  "PERIODIC",
] as const;

const reportStatuses = ["DRAFT", "FINAL", "CANCELLED"] as const;
const reportPriorities = ["NORMAL", "IMPORTANT", "URGENT"] as const;

const reportInputSchema = z.object({
  targetUserId: z.string().min(1),
  type: z.enum(reportTypes),
  title: z.string().trim().min(1).max(200),
  reportDate: z.string().datetime(),
  status: z.enum(reportStatuses).optional(),
  priority: z.enum(reportPriorities).optional(),
  reason: z.string().trim().max(4000).optional().nullable(),
  temperature: z.coerce.number().min(30).max(45).optional().nullable(),
  weightKg: z.coerce.number().min(1).max(300).optional().nullable(),
  bloodPressureSystolic: z.coerce.number().int().min(50).max(250).optional().nullable(),
  bloodPressureDiastolic: z.coerce.number().int().min(30).max(180).optional().nullable(),
  observations: z.string().trim().max(6000).optional().nullable(),
  actionsTaken: z.string().trim().max(6000).optional().nullable(),
  outcome: z.string().trim().max(4000).optional().nullable(),
  recommendations: z.string().trim().max(6000).optional().nullable(),
  parentContacted: z.boolean().optional(),
  parentContactedAt: z.string().datetime().optional().nullable(),
  referredTo: z.string().trim().max(400).optional().nullable(),
  notes: z.string().trim().max(6000).optional().nullable(),
});

const reportPatchSchema = reportInputSchema.omit({ targetUserId: true }).partial();

const reportSelect = {
  id: true,
  schoolId: true,
  targetUserId: true,
  createdByUserId: true,
  type: true,
  title: true,
  reportDate: true,
  status: true,
  priority: true,
  reason: true,
  temperature: true,
  weightKg: true,
  bloodPressureSystolic: true,
  bloodPressureDiastolic: true,
  observations: true,
  actionsTaken: true,
  outcome: true,
  recommendations: true,
  parentContacted: true,
  parentContactedAt: true,
  referredTo: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  target: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      studentProfile: {
        select: { id: true, studentNumber: true },
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      staffProfile: { select: { function: true } },
    },
  },
} as const;

async function requireMedicalFull(
  fastify: FastifyInstance,
  request: any,
  reply: any,
) {
  const access = await getMedicalAccess(
    fastify,
    request.user.sub,
    request.user.role,
    request.user.schoolId ?? null,
  );

  if (!access.allowed || access.mode !== "FULL") {
    await reply.code(403).send({
      error: { code: "MEDICAL_ACCESS_DENIED", message: access.reason ?? "Accès médical refusé." },
    });
    return false;
  }

  return true;
}

export const medicalReportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:userId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const userId = z.string().min(1).parse((request.params as { userId?: string }).userId);
      const result = await canAccessTarget(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
        userId,
      );

      if (!result.target || !result.access.allowed) {
        return reply.code(403).send({
          error: {
            code: "MEDICAL_REPORT_ACCESS_DENIED",
            message: result.access.reason ?? "Accès aux rapports médicaux refusé.",
          },
        });
      }

      const reports = await fastify.prisma.medicalReport.findMany({
        where: { targetUserId: userId },
        orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
        select: reportSelect,
      });

      return { reports, access: result.access };
    },
  );

  fastify.post(
    "/",
    { onRequest: [authenticate] },
    async (request, reply) => {
      if (!(await requireMedicalFull(fastify, request, reply))) return;

      const input = reportInputSchema.parse(request.body);
      const target = await canAccessTarget(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
        input.targetUserId,
      );

      if (!target.target || !target.access.allowed || !request.user.schoolId) {
        return reply.code(403).send({
          error: {
            code: "MEDICAL_REPORT_TARGET_DENIED",
            message: target.access.reason ?? "La personne ne peut pas recevoir un rapport médical.",
          },
        });
      }

      const report = await fastify.prisma.medicalReport.create({
        data: {
          schoolId: request.user.schoolId,
          targetUserId: input.targetUserId,
          createdByUserId: request.user.sub,
          type: input.type,
          title: input.title,
          reportDate: new Date(input.reportDate),
          status: input.status ?? "DRAFT",
          priority: input.priority ?? "NORMAL",
          reason: input.reason ?? null,
          temperature: input.temperature ?? null,
          weightKg: input.weightKg ?? null,
          bloodPressureSystolic: input.bloodPressureSystolic ?? null,
          bloodPressureDiastolic: input.bloodPressureDiastolic ?? null,
          observations: input.observations ?? null,
          actionsTaken: input.actionsTaken ?? null,
          outcome: input.outcome ?? null,
          recommendations: input.recommendations ?? null,
          parentContacted: input.parentContacted ?? false,
          parentContactedAt: input.parentContactedAt ? new Date(input.parentContactedAt) : null,
          referredTo: input.referredTo ?? null,
          notes: input.notes ?? null,
        },
        select: reportSelect,
      });

      return reply.code(201).send({ report });
    },
  );

  fastify.patch(
    "/:reportId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      if (!(await requireMedicalFull(fastify, request, reply))) return;

      const reportId = z.string().min(1).parse((request.params as { reportId?: string }).reportId);
      const input = reportPatchSchema.parse(request.body);

      const existing = await fastify.prisma.medicalReport.findUnique({
        where: { id: reportId },
        select: { id: true, schoolId: true, targetUserId: true },
      });

      if (!existing || existing.schoolId !== request.user.schoolId) {
        return reply.code(404).send({
          error: { code: "MEDICAL_REPORT_NOT_FOUND", message: "Rapport médical introuvable." },
        });
      }

      const target = await canAccessTarget(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
        existing.targetUserId,
      );

      if (!target.target || !target.access.allowed) {
        return reply.code(403).send({
          error: {
            code: "MEDICAL_REPORT_TARGET_DENIED",
            message: target.access.reason ?? "Accès au rapport médical refusé.",
          },
        });
      }

      const data: Prisma.MedicalReportUpdateInput = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.reportDate !== undefined ? { reportDate: input.reportDate } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
        ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
        ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
        ...(input.bloodPressureSystolic !== undefined ? { bloodPressureSystolic: input.bloodPressureSystolic } : {}),
        ...(input.bloodPressureDiastolic !== undefined ? { bloodPressureDiastolic: input.bloodPressureDiastolic } : {}),
        ...(input.observations !== undefined ? { observations: input.observations } : {}),
        ...(input.actionsTaken !== undefined ? { actionsTaken: input.actionsTaken } : {}),
        ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
        ...(input.recommendations !== undefined ? { recommendations: input.recommendations } : {}),
        ...(input.parentContacted !== undefined ? { parentContacted: input.parentContacted } : {}),
        ...(input.parentContactedAt !== undefined ? { parentContactedAt: input.parentContactedAt } : {}),
        ...(input.referredTo !== undefined ? { referredTo: input.referredTo } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      };

      if (typeof data.reportDate === "string") {
        data.reportDate = new Date(data.reportDate);
      }
      if (typeof data.parentContactedAt === "string") {
        data.parentContactedAt = new Date(data.parentContactedAt);
      }

      const report = await fastify.prisma.medicalReport.update({
        where: { id: reportId },
        data,
        select: reportSelect,
      });

      return { report };
    },
  );

  fastify.delete(
    "/:reportId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      if (!(await requireMedicalFull(fastify, request, reply))) return;

      const reportId = z.string().min(1).parse((request.params as { reportId?: string }).reportId);
      const existing = await fastify.prisma.medicalReport.findUnique({
        where: { id: reportId },
        select: { id: true, schoolId: true, targetUserId: true },
      });

      if (!existing || existing.schoolId !== request.user.schoolId) {
        return reply.code(404).send({
          error: { code: "MEDICAL_REPORT_NOT_FOUND", message: "Rapport médical introuvable." },
        });
      }

      const target = await canAccessTarget(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
        existing.targetUserId,
      );

      if (!target.target || !target.access.allowed) {
        return reply.code(403).send({
          error: {
            code: "MEDICAL_REPORT_TARGET_DENIED",
            message: target.access.reason ?? "Accès au rapport médical refusé.",
          },
        });
      }

      await fastify.prisma.medicalReport.delete({ where: { id: reportId } });
      return reply.code(204).send();
    },
  );
};

export default medicalReportRoutes;
