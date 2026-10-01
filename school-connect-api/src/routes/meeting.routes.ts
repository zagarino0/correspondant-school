import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const meetingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/meetings", { onRequest: [authenticate, authorize("meeting.read")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId && request.user.role !== "SUPER_ADMIN") return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const meetings = await fastify.prisma.meeting.findMany({ where: schoolId ? { schoolId } : {}, orderBy: { scheduledAt: "asc" }, take: 100, select: { id: true, schoolId: true, studentId: true, title: true, type: true, description: true, scheduledAt: true, status: true, notes: true, createdBy: true, createdAt: true, updatedAt: true, student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } } } });
    return reply.send({ meetings });
  });

  fastify.post("/meetings", { onRequest: [authenticate, authorize("meeting.create")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const parsed = z.object({ studentId: z.string().min(1).optional(), title: z.string().trim().min(1).max(200), type: z.string().trim().min(1).max(100), description: z.string().trim().max(2000).optional(), scheduledAt: z.string().datetime(), notes: z.string().trim().max(5000).optional() }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid meeting data.", details: parsed.error.flatten().fieldErrors } });
    if (parsed.data.studentId && !await fastify.prisma.student.findFirst({ where: { id: parsed.data.studentId, schoolId }, select: { id: true } })) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found in this school." } });
    const meeting = await fastify.prisma.meeting.create({ data: { title: parsed.data.title, type: parsed.data.type, scheduledAt: new Date(parsed.data.scheduledAt), schoolId, createdBy: request.user.sub, ...(parsed.data.studentId !== undefined ? { studentId: parsed.data.studentId } : {}), ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}), ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}) } });
    return reply.status(201).send({ meeting });
  });

  fastify.patch("/meetings/:meetingId", { onRequest: [authenticate, authorize("meeting.update")] }, async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const schoolId = request.user.schoolId;
    if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    if (!await fastify.prisma.meeting.findFirst({ where: { id: meetingId, schoolId }, select: { id: true } })) return reply.status(404).send({ error: { code: "MEETING_NOT_FOUND", message: "Meeting not found." } });
    const parsed = z.object({ studentId: z.string().min(1).nullable().optional(), title: z.string().trim().min(1).max(200).optional(), type: z.string().trim().min(1).max(100).optional(), description: z.string().trim().max(2000).nullable().optional(), scheduledAt: z.string().datetime().optional(), status: z.enum(["SCHEDULED","COMPLETED","CANCELLED"]).optional(), notes: z.string().trim().max(5000).nullable().optional() }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid meeting data.", details: parsed.error.flatten().fieldErrors } });
    if (parsed.data.studentId && !await fastify.prisma.student.findFirst({ where: { id: parsed.data.studentId, schoolId }, select: { id: true } })) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found in this school." } });
    const { scheduledAt, ...rest } = parsed.data;
    const meeting = await fastify.prisma.meeting.update({ where: { id: meetingId }, data: { ...(rest.studentId !== undefined ? { studentId: rest.studentId } : {}), ...(rest.title !== undefined ? { title: rest.title } : {}), ...(rest.type !== undefined ? { type: rest.type } : {}), ...(rest.description !== undefined ? { description: rest.description } : {}), ...(rest.status !== undefined ? { status: rest.status } : {}), ...(rest.notes !== undefined ? { notes: rest.notes } : {}), ...(scheduledAt !== undefined ? { scheduledAt: new Date(scheduledAt) } : {}) } });
    return reply.send({ meeting });
  });
};

export default meetingRoutes;
