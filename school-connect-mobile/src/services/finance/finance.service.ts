import { apiClient } from "../api/client";
import type {
  AllocatePaymentResult,
  FinancialInvoice,
  FinancialPayment,
} from "./finance.types";

export async function getFinancialInvoices(params?: {
  studentId?: string;
  status?: FinancialInvoice["status"];
  take?: number;
}): Promise<{ invoices: FinancialInvoice[] }> {
  const response = await apiClient.get<{ invoices: FinancialInvoice[] }>(
    "/api/v1/invoices",
    { params },
  );
  return response.data;
}

export async function getFinancialInvoice(
  invoiceId: string,
): Promise<FinancialInvoice> {
  const response = await apiClient.get<{ invoices: FinancialInvoice[] }>(
    "/api/v1/invoices",
    { params: { take: 100 } },
  );

  const invoice = response.data.invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  return invoice;
}

export async function getFinancialPayments(): Promise<{
  payments: FinancialPayment[];
}> {
  const response = await apiClient.get<{ payments: FinancialPayment[] }>(
    "/api/v1/payments",
  );
  return response.data;
}

export async function allocateFinancialPayment(
  paymentId: string,
  input: { invoiceId: string; amount: number },
): Promise<AllocatePaymentResult> {
  const response = await apiClient.post<AllocatePaymentResult>(
    `/api/v1/payments/${paymentId}/allocations`,
    input,
  );
  return response.data;
}
