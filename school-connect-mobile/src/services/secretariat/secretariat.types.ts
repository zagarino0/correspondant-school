export type SecretariatDocument = {
  id: string;
  schoolId: string;
  title: string;
  type: string;
  description: string | null;
  fileUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; firstName: string; lastName: string };
};

export type SecretariatMeeting = {
  id: string;
  schoolId: string;
  studentId: string | null;
  title: string;
  type: string;
  description: string | null;
  scheduledAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  student: { id: string; firstName: string; lastName: string; studentNumber: string } | null;
};

export type SecretariatPayment = {
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
  student: { id: string; firstName: string; lastName: string; studentNumber: string } | null;
};

export type SecretariatTicket = {
  id: string;
  schoolId: string;
  subject: string;
  description: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdBy: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateDocumentInput = {
  title: string;
  type: string;
  description?: string;
  fileUrl?: string;
};

export type CreateMeetingInput = {
  studentId?: string;
  title: string;
  type: string;
  description?: string;
  scheduledAt: string;
  notes?: string;
};

export type UpdateMeetingInput = {
  studentId?: string | null;
  title?: string;
  type?: string;
  description?: string | null;
  scheduledAt?: string;
  notes?: string | null;
  status?: SecretariatMeeting["status"];
};

export type CreatePaymentInput = {
  studentId?: string;
  amount: number;
  currency?: string;
  method: string;
  reference?: string;
  description?: string;
  paidAt?: string;
};

export type CreateTicketInput = {
  subject: string;
  description: string;
  priority?: SecretariatTicket["priority"];
};

export type UpdateTicketInput = {
  priority?: SecretariatTicket["priority"];
  status?: SecretariatTicket["status"];
  assignedTo?: string | null;
};
