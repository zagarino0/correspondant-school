import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/documents", { onRequest: [authenticate, authorize("document.read")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId && request.user.role !== "SUPER_ADMIN") return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const documents = await fastify.prisma.document.findMany({ where: schoolId ? { schoolId } : undefined, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, schoolId: true, title: true, type: true, description: true, fileUrl: true, createdBy: true, createdAt: true, updatedAt: true, creator: { select: { id: true, firstName: true, lastName: true } } } });
    return reply.send({ documents });
  });

  fastify.post("/documents", { onRequest: [authenticate, authorize("document.create")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const parsed = z.object({ title: z.string().trim().min(1).max(200), type: z.string().trim().min(1).max(100), description: z.string().trim().max(2000).optional(), fileUrl: z.string().url().optional() }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid document data.", details: parsed.error.flatten().fieldErrors } });
    const document = await fastify.prisma.document.create({ data: { ...parsed.data, schoolId, createdBy: request.user.sub } });
    return reply.status(201).send({ document });
  });
};

export default documentRoutes;
