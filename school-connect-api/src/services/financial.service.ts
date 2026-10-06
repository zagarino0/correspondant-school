import { Prisma } from "@prisma/client";

const MAX_ALLOCATION_RETRIES = 3;

export type InvoiceItemInput = {
  label: string;
  category?: string;
  quantity: number;
  unitAmount: number;
};

function decimal(value: number) {
  return new Prisma.Decimal(String(value));
}

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

export async function createInvoice(
  prisma: any,
  input: {
    schoolId: string;
    studentId: string;
    academicYearId: string;
    number: string;
    issueDate?: Date;
    dueDate?: Date;
    currency?: string;
    notes?: string;
    items: InvoiceItemInput[];
  },
) {
  if (input.items.length === 0) {
    throw new Error("INVOICE_ITEMS_REQUIRED");
  }

  return prisma.$transaction(async (tx: any) => {
    const [student, academicYear] = await Promise.all([
      tx.student.findFirst({
        where: { id: input.studentId, schoolId: input.schoolId },
        select: { id: true },
      }),
      tx.academicYear.findFirst({
        where: { id: input.academicYearId, schoolId: input.schoolId },
        select: { id: true },
      }),
    ]);

    if (!student) throw new Error("STUDENT_NOT_FOUND");
    if (!academicYear) throw new Error("ACADEMIC_YEAR_NOT_FOUND");

    const items = input.items.map((item) => {
      const quantity = decimal(item.quantity);
      const unitAmount = decimal(item.unitAmount);
      const totalAmount = quantity.mul(unitAmount);

      return {
        label: item.label.trim(),
        category: item.category?.trim() || undefined,
        quantity,
        unitAmount,
        totalAmount,
      };
    });

    const totalAmount = items.reduce(
      (sum: Prisma.Decimal, item: { totalAmount: Prisma.Decimal }) =>
        sum.add(item.totalAmount),
      new Prisma.Decimal(0),
    );

    return tx.invoice.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        number: input.number.trim(),
        issueDate: input.issueDate ?? new Date(),
        dueDate: input.dueDate,
        currency: input.currency ?? "MGA",
        status: "ISSUED",
        notes: input.notes?.trim() || undefined,
        totalAmount,
        items: { create: items },
      },
      include: {
        items: true,
      },
    });
  });
}

export async function getInvoices(
  prisma: any,
  input: {
    schoolId: string;
    studentId?: string;
    status?: string;
    take?: number;
  },
) {
  const invoices = await prisma.invoice.findMany({
    where: {
      schoolId: input.schoolId,
      ...(input.studentId ? { studentId: input.studentId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: input.take ?? 100,
    include: {
      items: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentNumber: true,
        },
      },
      allocations: {
        select: {
          id: true,
          paymentId: true,
          amount: true,
          createdAt: true,
        },
      },
    },
  });

  return invoices.map((invoice: any) => {
    const allocatedAmount = invoice.allocations.reduce(
      (sum: Prisma.Decimal, allocation: { amount: Prisma.Decimal }) =>
        sum.add(allocation.amount),
      new Prisma.Decimal(0),
    );
    const balanceAmount = invoice.totalAmount.sub(allocatedAmount);

    return {
      ...invoice,
      allocatedAmount,
      balanceAmount,
    };
  });
}

export async function allocatePayment(
  prisma: any,
  input: {
    schoolId: string;
    paymentId: string;
    invoiceId: string;
    amount: number;
  },
) {
  const allocationAmount = decimal(input.amount);

  for (let attempt = 0; attempt < MAX_ALLOCATION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx: any) => {
          const payment = await tx.payment.findFirst({
            where: {
              id: input.paymentId,
              schoolId: input.schoolId,
            },
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              studentId: true,
            },
          });

          if (!payment) throw new Error("PAYMENT_NOT_FOUND");
          if (payment.status !== "RECORDED") {
            throw new Error("PAYMENT_NOT_ALLOCATABLE");
          }

          const invoice = await tx.invoice.findFirst({
            where: {
              id: input.invoiceId,
              schoolId: input.schoolId,
            },
            select: {
              id: true,
              studentId: true,
              totalAmount: true,
              currency: true,
              status: true,
            },
          });

          if (!invoice) throw new Error("INVOICE_NOT_FOUND");
          if (!["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status)) {
            throw new Error("INVOICE_NOT_ALLOCATABLE");
          }

          if (
            payment.studentId &&
            payment.studentId !== invoice.studentId
          ) {
            throw new Error("STUDENT_MISMATCH");
          }

          if (payment.currency !== invoice.currency) {
            throw new Error("CURRENCY_MISMATCH");
          }

          const existing = await tx.paymentAllocation.findUnique({
            where: {
              paymentId_invoiceId: {
                paymentId: input.paymentId,
                invoiceId: input.invoiceId,
              },
            },
            select: { id: true },
          });

          if (existing) {
            throw new Error("ALLOCATION_ALREADY_EXISTS");
          }

          const paymentAllocated = await tx.paymentAllocation.aggregate({
            where: { paymentId: input.paymentId },
            _sum: { amount: true },
          });

          const invoiceAllocated = await tx.paymentAllocation.aggregate({
            where: { invoiceId: input.invoiceId },
            _sum: { amount: true },
          });

          const paymentUsed =
            paymentAllocated._sum.amount ?? new Prisma.Decimal(0);
          const invoiceUsed =
            invoiceAllocated._sum.amount ?? new Prisma.Decimal(0);

          const paymentAvailable = payment.amount.sub(paymentUsed);
          const invoiceBalance = invoice.totalAmount.sub(invoiceUsed);

          if (allocationAmount.gt(paymentAvailable)) {
            throw new Error("PAYMENT_AMOUNT_EXCEEDED");
          }

          if (allocationAmount.gt(invoiceBalance)) {
            throw new Error("INVOICE_BALANCE_EXCEEDED");
          }

          const allocation = await tx.paymentAllocation.create({
            data: {
              paymentId: input.paymentId,
              invoiceId: input.invoiceId,
              amount: allocationAmount,
            },
          });

          const newInvoiceBalance = invoiceBalance.sub(allocationAmount);

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              status:
                newInvoiceBalance.eq(0)
                  ? "PAID"
                  : "PARTIALLY_PAID",
            },
          });

          return {
            allocation,
            paymentAvailable: paymentAvailable.sub(allocationAmount),
            invoiceBalance: newInvoiceBalance,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (error: any) {
      if (error?.code === "P2034" && attempt < MAX_ALLOCATION_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("ALLOCATION_TRANSACTION_FAILED");
}

export function serializeMoney(value: Prisma.Decimal) {
  return decimalToNumber(value);
}
