import { apiClient } from "../api/client";

export type TeacherIncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type CreateTeacherIncidentInput = {
  studentId: string;
  type: string;
  severity: TeacherIncidentSeverity;
  description: string;
  occurredAt?: string;
  location?: string | null;
};

export async function createTeacherIncident(input: CreateTeacherIncidentInput) {
  const response = await apiClient.post(
    `/api/v1/surveillant/school-life/students/${input.studentId}/incidents`,
    {
      type: input.type,
      severity: input.severity,
      description: input.description,
      occurredAt: input.occurredAt,
      location: input.location ?? null,
    },
  );

  return response.data;
}
