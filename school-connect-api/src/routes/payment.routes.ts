import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/payments", { onRequest: [authenticate, authorize("payment.read")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId && request.user.role !== "SUPER_ADMIN") return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const payments = await fastify.prisma.payment.findMany({ where: schoolId ? { schoolId } : undefined, orderBy: { paidAt: "desc" }, take: 100, select: { id: true, schoolId: true, studentId: true, amount: true, currency: true, method: true, reference: true, description: true, status: true, paidAt: true, receivedBy: true, createdAt: true, student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } } } });
    return reply.send({ payments });
  });

  fastify.post("/payments", { onRequest: [authenticate, authorize("payment.create")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const parsed = z.object({ studentId: z.string().min(1).optional(), amount: z.coerce.number().positive(), currency: z.string().trim().length(3).default("MGA"), method: z.string().trim().min(1).max(50), reference: z.string().trim().max(100).optional(), description: z.string().trim().max(1000).optional(), paidAt: z.string().datetime().optional() }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid payment data.", details: parsed.error.flatten().fieldErrors } });
    if (parsed.data.studentId && !await fastify.prisma.student.findFirst({ where: { id: parsed.data.studentId, schoolId }, select: { id: true } })) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found in this school." } });
    const payment = await fastify.prisma.payment.create({ data: { ...parsed.data, amount: parsed.data.amount, paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(), schoolId, receivedBy: request.user.sub } });
    return reply.status(201).send({ payment });
  });
};

export default paymentRoutes;
