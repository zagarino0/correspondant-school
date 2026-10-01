import { apiClient } from "../api/client";

export type DisciplineActionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type ApprovedDisciplinaryAction = {
  id: string;
  studentId: string;
  incidentId: string | null;
  type: string;
  status: DisciplineActionStatus;
  approvalStatus: "APPROVED";
  description: string;
  decisionNote: string | null;
  actionAt: string;
  dueAt: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  student: {
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
};

export type DisciplineIncident = {
  id: string;
  studentId: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  description: string;
  occurredAt: string;
  location: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  reportedBy: string;
  student: {
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
};

export type StudentDisciplineResponse = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
  actions: ApprovedDisciplinaryAction[];
};

export type ParentDisciplineResponse = {
  children: Array<{
    id: string;
    schoolId: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
  }>;
  actions: ApprovedDisciplinaryAction[];
};

export type TeacherDisciplineResponse = {
  incidents: DisciplineIncident[];
  actions: ApprovedDisciplinaryAction[];
};

export async function getMyStudentDiscipline(): Promise<StudentDisciplineResponse> {
  const response = await apiClient.get<StudentDisciplineResponse>("/api/v1/discipline/me");
  return response.data;
}

export async function getMyChildrenDiscipline(): Promise<ParentDisciplineResponse> {
  const response = await apiClient.get<ParentDisciplineResponse>("/api/v1/discipline/me");
  return response.data;
}

export async function getMyTeacherDiscipline(): Promise<TeacherDisciplineResponse> {
  const response = await apiClient.get<TeacherDisciplineResponse>("/api/v1/discipline/me");
  return response.data;
}
