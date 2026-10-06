import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { z } from "zod";
import { allocatePayment, serializeMoney } from "../services/financial.service.js";

const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/payments", { onRequest: [authenticate, authorize("payment.read")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId && request.user.role !== "SUPER_ADMIN") return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const payments = await fastify.prisma.payment.findMany({ where: schoolId ? { schoolId } : {}, orderBy: { paidAt: "desc" }, take: 100, select: { id: true, schoolId: true, studentId: true, amount: true, currency: true, method: true, reference: true, description: true, status: true, paidAt: true, receivedBy: true, createdAt: true, student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } } } });
    return reply.send({ payments });
  });

  fastify.post(
    "/payments/:paymentId/allocations",
    {
      onRequest: [
        authenticate,
        authorize("payment-allocation.create"),
      ],
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({
          error: {
            code: "SCHOOL_CONTEXT_REQUIRED",
            message: "A school context is required.",
          },
        });
      }

      const params = z
        .object({ paymentId: z.string().min(1) })
        .safeParse(request.params);
      const body = z
        .object({
          invoiceId: z.string().min(1),
          amount: z.coerce.number().positive(),
        })
        .safeParse(request.body);

      if (!params.success || !body.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid payment allocation data.",
          },
        });
      }

      try {
        const result = await allocatePayment(fastify.prisma, {
          schoolId,
          paymentId: params.data.paymentId,
          invoiceId: body.data.invoiceId,
          amount: body.data.amount,
        });

        return reply.status(201).send({
          allocation: {
            ...result.allocation,
            amount: serializeMoney(result.allocation.amount),
          },
          paymentAvailable: serializeMoney(result.paymentAvailable),
          invoiceBalance: serializeMoney(result.invoiceBalance),
        });
      } catch (error: any) {
        const statusByCode: Record<string, number> = {
          PAYMENT_NOT_FOUND: 404,
          INVOICE_NOT_FOUND: 404,
          PAYMENT_NOT_ALLOCATABLE: 409,
          INVOICE_NOT_ALLOCATABLE: 409,
          STUDENT_MISMATCH: 409,
          CURRENCY_MISMATCH: 409,
          ALLOCATION_ALREADY_EXISTS: 409,
          PAYMENT_AMOUNT_EXCEEDED: 409,
          INVOICE_BALANCE_EXCEEDED: 409,
          ALLOCATION_TRANSACTION_FAILED: 409,
        };
        const code = error?.message;
        const status = statusByCode[code];

        if (status) {
          return reply.status(status).send({
            error: {
              code,
              message:
                code === "PAYMENT_AMOUNT_EXCEEDED"
                  ? "The allocation exceeds the payment amount still available."
                  : code === "INVOICE_BALANCE_EXCEEDED"
                    ? "The allocation exceeds the invoice balance."
                    : "The payment allocation cannot be completed.",
            },
          });
        }

        throw error;
      }
    },
  );

  fastify.post("/payments", { onRequest: [authenticate, authorize("payment.create")] }, async (request, reply) => {
    const schoolId = request.user.schoolId;
    if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_CONTEXT_REQUIRED", message: "A school context is required." } });
    const parsed = z.object({ studentId: z.string().min(1).optional(), amount: z.coerce.number().positive(), currency: z.string().trim().length(3).default("MGA"), method: z.string().trim().min(1).max(50), reference: z.string().trim().max(100).optional(), description: z.string().trim().max(1000).optional(), paidAt: z.string().datetime().optional() }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid payment data.", details: parsed.error.flatten().fieldErrors } });
    if (parsed.data.studentId && !await fastify.prisma.student.findFirst({ where: { id: parsed.data.studentId, schoolId }, select: { id: true } })) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found in this school." } });
    const payment = await fastify.prisma.payment.create({ data: { amount: parsed.data.amount, currency: parsed.data.currency, method: parsed.data.method, paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(), schoolId, receivedBy: request.user.sub, ...(parsed.data.studentId !== undefined ? { studentId: parsed.data.studentId } : {}), ...(parsed.data.reference !== undefined ? { reference: parsed.data.reference } : {}), ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}) } });
    return reply.status(201).send({ payment });
  });
};

export default paymentRoutes;
