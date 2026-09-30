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


export type SchoolLifeExitItem = {
  id: string;
  studentId: string;
  type: "TEMPORARY" | "PERMANENT";
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  authorizedPersonName: string;
  authorizedPersonPhone: string | null;
  reason: string;
  exitAt: string;
  returnAt: string | null;
  student: { firstName: string; lastName: string; studentNumber: string };
};

export type SchoolLifeMovementItem = {
  id: string;
  studentId: string;
  type: "ENTRY" | "EXIT";
  reason: string | null;
  occurredAt: string;
  student: { firstName: string; lastName: string; studentNumber: string };
};

export type SchoolLifeIncidentItem = {
  id: string;
  studentId: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  occurredAt: string;
  student: { firstName: string; lastName: string; studentNumber: string };
};

export type SchoolLifeDisciplinaryItem = {
  id: string;
  studentId: string;
  incidentId: string | null;
  type: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  description: string;
  actionAt: string;
  student: { firstName: string; lastName: string; studentNumber: string };
};

export type SchoolLifeAuthorizationItem = {
  id: string;
  studentId: string;
  parentId: string;
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  student: { firstName: string; lastName: string; studentNumber: string };
};

export async function getSchoolLifeExits(params?: {
  status?: "OPEN" | "COMPLETED" | "CANCELLED";
  date?: string;
}): Promise<SchoolLifeExitItem[]> {
  const response = await apiClient.get<{ items: SchoolLifeExitItem[] }>(
    "/api/v1/surveillant/school-life/exits",
    { params },
  );
  return response.data.items;
}

export async function createSchoolLifeExit(
  studentId: string,
  input: {
    type: "TEMPORARY" | "PERMANENT";
    authorizedPersonName: string;
    authorizedPersonPhone?: string | null;
    reason: string;
    exitAt?: string;
    returnAt?: string | null;
  },
): Promise<SchoolLifeExitItem> {
  const response = await apiClient.post<{ item: SchoolLifeExitItem }>(
    `/api/v1/surveillant/school-life/students/${studentId}/exits`,
    input,
  );
  return response.data.item;
}

export async function updateSchoolLifeExit(
  studentId: string,
  exitId: string,
  input: {
    status?: "OPEN" | "COMPLETED" | "CANCELLED";
    returnAt?: string | null;
  },
): Promise<SchoolLifeExitItem> {
  const response = await apiClient.patch<{ item: SchoolLifeExitItem }>(
    `/api/v1/surveillant/school-life/students/${studentId}/exits/${exitId}`,
    input,
  );
  return response.data.item;
}

export async function getSchoolLifeMovements(params?: {
  date?: string;
}): Promise<SchoolLifeMovementItem[]> {
  const response = await apiClient.get<{ items: SchoolLifeMovementItem[] }>(
    "/api/v1/surveillant/school-life/movements",
    { params },
  );
  return response.data.items;
}

export async function createSchoolLifeMovement(
  studentId: string,
  input: {
    type: "ENTRY" | "EXIT";
    reason: string;
    occurredAt?: string;
  },
): Promise<SchoolLifeMovementItem> {
  const response = await apiClient.post<{ item: SchoolLifeMovementItem }>(
    `/api/v1/surveillant/school-life/students/${studentId}/movements`,
    input,
  );
  return response.data.item;
}

export async function updateSchoolLifeMovement(
  studentId: string,
  movementId: string,
  input: {
    type?: "ENTRY" | "EXIT";
    reason?: string;
    occurredAt?: string;
  },
): Promise<SchoolLifeMovementItem> {
  const response = await apiClient.patch<{ item: SchoolLifeMovementItem }>(
    `/api/v1/surveillant/school-life/students/${studentId}/movements/${movementId}`,
    input,
  );
  return response.data.item;
}

export async function getSchoolLifeIncidents(params?: {
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}): Promise<SchoolLifeIncidentItem[]> {
  const response = await apiClient.get<{ items: SchoolLifeIncidentItem[] }>(
    "/api/v1/surveillant/school-life/incidents",
    { params },
  );
  return response.data.items;
}

export async function getSchoolLifeDisciplinaryActions(): Promise<SchoolLifeDisciplinaryItem[]> {
  const response = await apiClient.get<{ items: SchoolLifeDisciplinaryItem[] }>(
    "/api/v1/surveillant/school-life/disciplinary-actions",
  );
  return response.data.items;
}

export async function getSchoolLifeAuthorizations(): Promise<SchoolLifeAuthorizationItem[]> {
  const response = await apiClient.get<{ items: SchoolLifeAuthorizationItem[] }>(
    "/api/v1/surveillant/school-life/authorizations",
  );
  return response.data.items;
}
