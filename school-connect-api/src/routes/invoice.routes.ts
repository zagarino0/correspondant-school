import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import {
  createInvoice,
  getInvoices,
  serializeMoney,
} from "../services/financial.service.js";

const invoiceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/invoices",
    { onRequest: [authenticate, authorize("invoice.read")] },
    async (request, reply) => {
      const schoolId = request.user.schoolId;
      if (!schoolId && request.user.role !== "SUPER_ADMIN") {
        return reply.status(403).send({
          error: {
            code: "SCHOOL_CONTEXT_REQUIRED",
            message: "A school context is required.",
          },
        });
      }

      const query = z
        .object({
          studentId: z.string().min(1).optional(),
          status: z
            .enum([
              "DRAFT",
              "ISSUED",
              "PARTIALLY_PAID",
              "PAID",
              "OVERDUE",
              "CANCELLED",
            ])
            .optional(),
          take: z.coerce.number().int().min(1).max(100).default(100),
        })
        .safeParse(request.query);

      if (!query.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid invoice filters.",
            details: query.error.flatten().fieldErrors,
          },
        });
      }

      const invoices = await getInvoices(fastify.prisma, {
        schoolId: schoolId ?? "",
        ...query.data,
      });

      return reply.send({
        invoices: invoices.map((invoice: any) => ({
          ...invoice,
          totalAmount: serializeMoney(invoice.totalAmount),
          allocatedAmount: serializeMoney(invoice.allocatedAmount),
          balanceAmount: serializeMoney(invoice.balanceAmount),
          items: invoice.items.map((item: any) => ({
            ...item,
            quantity: serializeMoney(item.quantity),
            unitAmount: serializeMoney(item.unitAmount),
            totalAmount: serializeMoney(item.totalAmount),
          })),
          allocations: invoice.allocations.map((allocation: any) => ({
            ...allocation,
            amount: serializeMoney(allocation.amount),
          })),
        })),
      });
    },
  );

  fastify.post(
    "/invoices",
    { onRequest: [authenticate, authorize("invoice.create")] },
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

      const parsed = z
        .object({
          studentId: z.string().min(1),
          academicYearId: z.string().min(1),
          number: z.string().trim().min(1).max(100),
          issueDate: z.string().datetime().optional(),
          dueDate: z.string().datetime().optional(),
          currency: z.string().trim().length(3).default("MGA"),
          notes: z.string().trim().max(2000).optional(),
          items: z
            .array(
              z.object({
                label: z.string().trim().min(1).max(255),
                category: z.string().trim().max(100).optional(),
                quantity: z.coerce.number().positive(),
                unitAmount: z.coerce.number().positive(),
              }),
            )
            .min(1),
        })
        .safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid invoice data.",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const invoice = await createInvoice(fastify.prisma, {
          schoolId,
          studentId: parsed.data.studentId,
          academicYearId: parsed.data.academicYearId,
          number: parsed.data.number,
          issueDate: parsed.data.issueDate
            ? new Date(parsed.data.issueDate)
            : undefined,
          dueDate: parsed.data.dueDate
            ? new Date(parsed.data.dueDate)
            : undefined,
          currency: parsed.data.currency,
          notes: parsed.data.notes,
          items: parsed.data.items,
        });

        return reply.status(201).send({
          invoice: {
            ...invoice,
            totalAmount: serializeMoney(invoice.totalAmount),
            items: invoice.items.map((item: any) => ({
              ...item,
              quantity: serializeMoney(item.quantity),
              unitAmount: serializeMoney(item.unitAmount),
              totalAmount: serializeMoney(item.totalAmount),
            })),
          },
        });
      } catch (error: any) {
        if (error?.code === "P2002") {
          return reply.status(409).send({
            error: {
              code: "INVOICE_NUMBER_ALREADY_EXISTS",
              message: "Invoice number already exists for this school.",
            },
          });
        }

        if (error?.message === "STUDENT_NOT_FOUND") {
          return reply.status(404).send({
            error: {
              code: "STUDENT_NOT_FOUND",
              message: "Student not found in this school.",
            },
          });
        }

        if (error?.message === "ACADEMIC_YEAR_NOT_FOUND") {
          return reply.status(404).send({
            error: {
              code: "ACADEMIC_YEAR_NOT_FOUND",
              message: "Academic year not found in this school.",
            },
          });
        }

        throw error;
      }
    },
  );
};

export default invoiceRoutes;
