export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type FinancialInvoiceItem = {
  id: string;
  label: string;
  category: string | null;
  quantity: string | number;
  unitAmount: string | number;
  totalAmount: string | number;
};

export type FinancialPaymentAllocation = {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: string | number;
  createdAt: string;
};

export type FinancialInvoice = {
  id: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  number: string;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  totalAmount: string | number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
  items: FinancialInvoiceItem[];
  allocations: FinancialPaymentAllocation[];
  allocatedAmount: string | number;
  balanceAmount: string | number;
};

export type FinancialPayment = {
  id: string;
  schoolId: string;
  studentId: string | null;
  amount: string | number;
  currency: string;
  method: string;
  reference: string | null;
  description: string | null;
  status: "RECORDED" | "CANCELLED";
  paidAt: string;
  receivedBy: string;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
  } | null;
};

export type AllocatePaymentResult = {
  allocation: FinancialPaymentAllocation;
  paymentAvailable: string | number;
  invoiceBalance: string | number;
};
