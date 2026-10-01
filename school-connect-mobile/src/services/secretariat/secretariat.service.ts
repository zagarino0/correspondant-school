import { apiClient } from "../api/client";
import type {
  CreateDocumentInput,
  CreateMeetingInput,
  CreatePaymentInput,
  CreateTicketInput,
  SecretariatDocument,
  SecretariatMeeting,
  SecretariatPayment,
  SecretariatTicket,
  UpdateMeetingInput,
  UpdateTicketInput,
} from "./secretariat.types";

export async function getSecretariatDocuments(): Promise<{ documents: SecretariatDocument[] }> {
  const response = await apiClient.get<{ documents: SecretariatDocument[] }>("/api/v1/documents");
  return response.data;
}

export async function createSecretariatDocument(input: CreateDocumentInput) {
  const response = await apiClient.post<{ document: SecretariatDocument }>("/api/v1/documents", input);
  return response.data;
}

export async function getSecretariatMeetings(): Promise<{ meetings: SecretariatMeeting[] }> {
  const response = await apiClient.get<{ meetings: SecretariatMeeting[] }>("/api/v1/meetings");
  return response.data;
}

export async function createSecretariatMeeting(input: CreateMeetingInput) {
  const response = await apiClient.post<{ meeting: SecretariatMeeting }>("/api/v1/meetings", input);
  return response.data;
}

export async function updateSecretariatMeeting(meetingId: string, input: UpdateMeetingInput) {
  const response = await apiClient.patch<{ meeting: SecretariatMeeting }>(`/api/v1/meetings/${meetingId}`, input);
  return response.data;
}

export async function getSecretariatPayments(): Promise<{ payments: SecretariatPayment[] }> {
  const response = await apiClient.get<{ payments: SecretariatPayment[] }>("/api/v1/payments");
  return response.data;
}

export async function createSecretariatPayment(input: CreatePaymentInput) {
  const response = await apiClient.post<{ payment: SecretariatPayment }>("/api/v1/payments", input);
  return response.data;
}

export async function getSecretariatTickets(): Promise<{ tickets: SecretariatTicket[] }> {
  const response = await apiClient.get<{ tickets: SecretariatTicket[] }>("/api/v1/tickets");
  return response.data;
}

export async function createSecretariatTicket(input: CreateTicketInput) {
  const response = await apiClient.post<{ ticket: SecretariatTicket }>("/api/v1/tickets", input);
  return response.data;
}

export async function updateSecretariatTicket(ticketId: string, input: UpdateTicketInput) {
  const response = await apiClient.patch<{ ticket: SecretariatTicket }>(`/api/v1/tickets/${ticketId}`, input);
  return response.data;
}

export type SecretariatAttendance = {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  arrivalTime: string | null;
  reason: string | null;
  note: string | null;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
  recorder: { id: string; firstName: string; lastName: string };
};

export async function getStudentAttendance(studentId: string): Promise<{
  student: { id: string; studentNumber: string; firstName: string; lastName: string };
  attendance: SecretariatAttendance[];
}> {
  const response = await apiClient.get("/api/v1/attendance/student/" + studentId);
  return response.data;
}
