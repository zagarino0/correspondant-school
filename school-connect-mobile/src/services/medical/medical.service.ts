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
