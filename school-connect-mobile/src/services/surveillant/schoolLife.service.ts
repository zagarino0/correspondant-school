import { apiClient } from "../api/client";

export type SchoolLifeProfile = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  parents: Array<{
    relationship: string;
    isPrimary: boolean;
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    };
  }>;
  enrollments: Array<{
    class: { id: string; name: string; level: string | null };
    academicYear: { id: string; name: string };
  }>;
  attendances: Array<{
    id: string;
    date: string;
    status: string;
    arrivalTime: string | null;
    reason: string | null;
    note: string | null;
  }>;
  studentExits: Array<{
    id: string;
    type: "TEMPORARY" | "PERMANENT";
    status: "OPEN" | "COMPLETED" | "CANCELLED";
    authorizedPersonName: string;
    authorizedPersonPhone: string | null;
    reason: string;
    exitAt: string;
    returnAt: string | null;
  }>;
  studentMovements: Array<{
    id: string;
    type: "ENTRY" | "EXIT";
    reason: string | null;
    occurredAt: string;
  }>;
  incidents: Array<{
    id: string;
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
    occurredAt: string;
  }>;
  disciplinaryActions: Array<{
    id: string;
    incidentId: string | null;
    type: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    description: string;
    actionAt: string;
  }>;
  schoolLifeObservations: Array<{
    id: string;
    content: string;
    observedAt: string;
    createdAt: string;
  }>;
  parentAuthorizations: Array<{
    id: string;
    parentId: string;
    type: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    reason: string | null;
    requestedAt: string;
    decidedAt: string | null;
  }>;
  parentSummons: Array<{
    id: string;
    parentId: string;
    reason: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED";
    scheduledAt: string | null;
    createdAt: string;
  }>;
};

export async function getSchoolLifeProfile(
  studentId: string,
): Promise<SchoolLifeProfile> {
  const response = await apiClient.get<{ student: SchoolLifeProfile }>(
    `/api/v1/surveillant/school-life/students/${studentId}/life-profile`,
  );

  return response.data.student;
}
