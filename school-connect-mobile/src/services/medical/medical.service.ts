import { apiClient } from "../api/client";

export type MedicalPersonRole = "STUDENT" | "TEACHER" | "STAFF";

export type MedicalPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  studentId: string | null;
  studentNumber: string | null;
  function: string | null;
};

export type MedicalRecord = {
  id: string;
  userId?: string;
  studentId?: string;
  bloodGroup: string | null;
  temperature: number | null;
  weightKg: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
  notes: string | null;
};

export type MedicalAccess = {
  allowed: boolean;
  role: string;
  mode: "FULL" | "PARENT";
  reason?: string;
};

export type MedicalPersonDetails = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  schoolId: string | null;
  student: {
    id: string;
    studentNumber: string;
    dateOfBirth: string | null;
    gender: "MALE" | "FEMALE" | null;
    status: string;
  } | null;
  function: string | null;
};

export type MedicalDetailsResponse = {
  access: MedicalAccess;
  person: MedicalPersonDetails;
  record: MedicalRecord | null;
  recordType: "STUDENT" | "ADULT";
};

export type MedicalUpdateInput = {
  bloodGroup?: string | null;
  temperature?: number | null;
  weightKg?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  medications?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  doctorName?: string | null;
  doctorPhone?: string | null;
  notes?: string | null;
};

export type MedicalChild = {
  userId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  dateOfBirth: string | null;
  gender: "MALE" | "FEMALE" | null;
  schoolId: string;
  relationship: string | null;
  isPrimary: boolean;
};

export async function getMedicalAccess(): Promise<MedicalAccess> {
  const response = await apiClient.get<MedicalAccess>("/api/v1/medical/access");
  return response.data;
}

export async function getMedicalPeople(): Promise<{ people: MedicalPerson[] }> {
  const response = await apiClient.get<{ people: MedicalPerson[] }>(
    "/api/v1/medical/people",
  );
  return response.data;
}

export async function getMedicalChildren(): Promise<{ children: MedicalChild[] }> {
  const response = await apiClient.get<{ children: MedicalChild[] }>(
    "/api/v1/medical/my-children",
  );
  return response.data;
}

export async function getMedicalDetails(userId: string): Promise<MedicalDetailsResponse> {
  const response = await apiClient.get<MedicalDetailsResponse>(
    `/api/v1/medical/${encodeURIComponent(userId)}`,
  );
  return response.data;
}

export async function updateMedicalRecord(
  userId: string,
  input: MedicalUpdateInput,
): Promise<MedicalDetailsResponse> {
  const response = await apiClient.patch<{
    record: MedicalRecord;
    recordType: "STUDENT" | "ADULT";
  }>(`/api/v1/medical/${encodeURIComponent(userId)}`, input);

  return getMedicalDetails(userId);
}


export type MedicalHistoryEntry = {
  id: string;
  action: "CREATED" | "UPDATED";
  field: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    function: string | null;
  };
};

export async function getMedicalHistory(userId: string): Promise<{ history: MedicalHistoryEntry[] }> {
  const response = await apiClient.get<{ history: MedicalHistoryEntry[] }>(
    `/api/v1/medical-history/${encodeURIComponent(userId)}`,
  );
  return response.data;
}


export type MedicalDashboard = {
  access: MedicalAccess;
  scope: { schoolId: string };
  people: {
    students: number;
    adults: number;
    total: number;
  };
  records: {
    completed: number;
    missing: number;
    completionRate: number;
  };
  vigilance: {
    allergies: number;
    medicalConditions: number;
  };
  recentChanges: number;
};

export async function getMedicalDashboard(): Promise<MedicalDashboard> {
  const response = await apiClient.get<MedicalDashboard>("/api/v1/medical/dashboard");
  return response.data;
}


export type MedicalEventType =
  | "CONSULTATION"
  | "MEDICAL_VISIT"
  | "FOLLOW_UP"
  | "MEDICATION"
  | "VIGILANCE";

export type MedicalEventStatus = "PLANNED" | "COMPLETED" | "CANCELLED";
export type MedicalEventPriority = "NORMAL" | "IMPORTANT" | "URGENT";

export type MedicalEvent = {
  id: string;
  schoolId: string;
  targetUserId: string | null;
  createdByUserId: string;
  type: MedicalEventType;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  status: MedicalEventStatus;
  priority: MedicalEventPriority;
  notes: string | null;
  target: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    studentProfile: { id: string; studentNumber: string } | null;
  } | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};

export type MedicalEventInput = {
  targetUserId: string;
  type: MedicalEventType;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  status?: MedicalEventStatus;
  priority?: MedicalEventPriority;
  notes?: string | null;
};

export async function getMedicalEvents(
  start?: string,
  end?: string,
): Promise<{ events: MedicalEvent[] }> {
  const response = await apiClient.get<{ events: MedicalEvent[] }>("/api/v1/medical/calendar", {
    params: { start, end },
  });
  return response.data;
}

export async function createMedicalEvent(input: MedicalEventInput): Promise<{ event: MedicalEvent }> {
  const response = await apiClient.post<{ event: MedicalEvent }>(
    "/api/v1/medical/calendar",
    input,
  );
  return response.data;
}

export async function updateMedicalEvent(
  eventId: string,
  input: Partial<MedicalEventInput>,
): Promise<{ event: MedicalEvent }> {
  const response = await apiClient.patch<{ event: MedicalEvent }>(
    `/api/v1/medical/calendar/${encodeURIComponent(eventId)}`,
    input,
  );
  return response.data;
}

export async function deleteMedicalEvent(eventId: string): Promise<void> {
  await apiClient.delete(`/api/v1/medical/calendar/${encodeURIComponent(eventId)}`);
}


export type MedicalReportType =
  | "INFIRMARY_VISIT"
  | "MEDICAL_INCIDENT"
  | "CONSULTATION"
  | "FOLLOW_UP"
  | "PERIODIC";

export type MedicalReportStatus = "DRAFT" | "FINAL" | "CANCELLED";
export type MedicalReportPriority = "NORMAL" | "IMPORTANT" | "URGENT";

export type MedicalReport = {
  id: string;
  schoolId: string;
  targetUserId: string;
  createdByUserId: string;
  type: MedicalReportType;
  title: string;
  reportDate: string;
  status: MedicalReportStatus;
  priority: MedicalReportPriority;
  reason: string | null;
  observations: string | null;
  actionsTaken: string | null;
  outcome: string | null;
  recommendations: string | null;
  parentContacted: boolean;
  parentContactedAt: string | null;
  referredTo: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  target: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    studentProfile: { id: string; studentNumber: string } | null;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    staffProfile: { function: string } | null;
  };
};

export type MedicalReportInput = {
  targetUserId: string;
  type: MedicalReportType;
  title: string;
  reportDate: string;
  status?: MedicalReportStatus;
  priority?: MedicalReportPriority;
  reason?: string | null;
  observations?: string | null;
  actionsTaken?: string | null;
  outcome?: string | null;
  recommendations?: string | null;
  parentContacted?: boolean;
  parentContactedAt?: string | null;
  referredTo?: string | null;
  notes?: string | null;
};

export async function getMedicalReports(userId: string): Promise<{ reports: MedicalReport[]; access: MedicalAccess }> {
  const response = await apiClient.get<{ reports: MedicalReport[]; access: MedicalAccess }>(
    `/api/v1/medical-reports/${encodeURIComponent(userId)}`,
  );
  return response.data;
}

export async function createMedicalReport(input: MedicalReportInput): Promise<{ report: MedicalReport }> {
  const response = await apiClient.post<{ report: MedicalReport }>(
    "/api/v1/medical-reports",
    input,
  );
  return response.data;
}

export async function updateMedicalReport(
  reportId: string,
  input: Partial<Omit<MedicalReportInput, "targetUserId">>,
): Promise<{ report: MedicalReport }> {
  const response = await apiClient.patch<{ report: MedicalReport }>(
    `/api/v1/medical-reports/${encodeURIComponent(reportId)}`,
    input,
  );
  return response.data;
}

export async function deleteMedicalReport(reportId: string): Promise<void> {
  await apiClient.delete(`/api/v1/medical-reports/${encodeURIComponent(reportId)}`);
}
