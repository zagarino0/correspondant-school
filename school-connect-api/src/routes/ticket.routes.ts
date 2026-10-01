import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const ticketRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/tickets", { onRequest: [authenticate, authorize("ticket.read")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId && request.user.role !== "SUPER_ADMIN") return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const tickets = await fastify.prisma.ticket.findMany({ where: schoolId ? { schoolId } : {}, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, schoolId: true, subject: true, description: true, priority: true, status: true, createdBy: true, assignedTo: true, createdAt: true, updatedAt: true } });
    return reply.send({ tickets });
  });

  fastify.post("/tickets", { onRequest: [authenticate, authorize("ticket.create")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const parsed = z.object({ subject: z.string().trim().min(1).max(200), description: z.string().trim().min(1).max(5000), priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]).default("NORMAL") }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid ticket data.", details: parsed.error.flatten().fieldErrors } });
    const ticket = await fastify.prisma.ticket.create({ data: { ...parsed.data, schoolId, createdBy: request.user.sub } });
    return reply.status(201).send({ ticket });
  });

  fastify.patch("/tickets/:ticketId", { onRequest: [authenticate, authorize("ticket.update")] }, async (request, reply) => {
    const { ticketId } = request.params as { ticketId: string };
    const schoolId = request.user.schoolId;
    if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    if (!await fastify.prisma.ticket.findFirst({ where: { id: ticketId, schoolId }, select: { id: true } })) return reply.status(404).send({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } });
    const parsed = z.object({ priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]).optional(), status: z.enum(["OPEN","IN_PROGRESS","RESOLVED","CLOSED"]).optional(), assignedTo: z.string().min(1).nullable().optional() }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid ticket data.", details: parsed.error.flatten().fieldErrors } });
    if (parsed.data.assignedTo && !await fastify.prisma.user.findFirst({ where: { id: parsed.data.assignedTo, schoolId, status: "ACTIVE" }, select: { id: true } })) return reply.status(404).send({ error: { code: "USER_NOT_FOUND", message: "Assignee not found in this school." } });
    const ticket = await fastify.prisma.ticket.update({ where: { id: ticketId }, data: { ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}), ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}), ...(parsed.data.assignedTo !== undefined ? { assignedTo: parsed.data.assignedTo } : {}) } });
    return reply.send({ ticket });
  });
};

export default ticketRoutes;
