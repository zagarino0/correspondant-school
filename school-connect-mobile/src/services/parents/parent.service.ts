import { apiClient } from "../api/client";

export type ParentChildEnrollment = {
  id: string;
  status: string;
  class: {
    id: string;
    name: string;
    level: string | null;
  };
  academicYear: {
    id: string;
    name: string;
  };
};

export type ParentChild = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  relationship: string | null;
  isPrimary: boolean;
  enrollment: ParentChildEnrollment | null;
};

export type ParentChildrenResponse = {
  children: ParentChild[];
};

export type ParentScheduleDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type ParentChildSchedule = {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  teacherId: string;
  subject: string;
  dayOfWeek: ParentScheduleDay;
  startTime: string;
  endTime: string;
  room: string | null;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type ParentChildScheduleResponse = {
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
  enrollment: {
    id: string;
    academicYear: {
      id: string;
      name: string;
    };
    class: {
      id: string;
      name: string;
      level: string;
    };
  };
  schedules: ParentChildSchedule[];
};

export async function getMyChildren(): Promise<ParentChildrenResponse> {
  const response = await apiClient.get<ParentChildrenResponse>(
    "/api/v1/parents/me/children",
  );

  return response.data;
}

export async function getChildSchedule(
  studentId: string,
): Promise<ParentChildScheduleResponse> {
  const response = await apiClient.get<ParentChildScheduleResponse>(
    `/api/v1/parents/me/children/${studentId}/schedule`,
  );

  return response.data;
}


export type ParentMedicalRecord = {
  id: string;
  bloodGroup: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
  notes: string | null;
  updatedAt: string;
};

export type ParentMedicalRecordResponse = {
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
  };
  medicalRecord: ParentMedicalRecord | null;
};

export async function getChildMedicalRecord(
  studentId: string,
): Promise<ParentMedicalRecordResponse> {
  const response = await apiClient.get<ParentMedicalRecordResponse>(
    `/api/v1/parents/me/children/${studentId}/medical-record`,
  );

  return response.data;
}

export type ParentSummons = {
  id: string;
  studentId: string;
  attendanceEventId: string | null;
  reason: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED";
  scheduledAt: string | null;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export async function getMySummons(): Promise<{ summons: ParentSummons[] }> {
  const response = await apiClient.get<{ summons: ParentSummons[] }>(
    "/api/v1/parents/me/summons",
  );

  return response.data;
}


export async function updateSummonsStatus(
  summonsId: string,
  status: "ACCEPTED" | "DECLINED",
): Promise<void> {
  await apiClient.patch(`/api/v1/parents/me/summons/${summonsId}`, { status });
}

export type ParentAuthorizationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ParentAuthorization = {
  id: string;
  schoolId: string;
  studentId: string;
  parentId: string;
  type: string;
  status: ParentAuthorizationStatus;
  reason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
};

export async function getMyAuthorizations(): Promise<{
  authorizations: ParentAuthorization[];
}> {
  const response = await apiClient.get<{
    authorizations: ParentAuthorization[];
  }>("/api/v1/parents/me/authorizations");

  return response.data;
}

export async function createAuthorization(input: {
  studentId: string;
  type: string;
  reason: string;
}): Promise<{ authorization: ParentAuthorization }> {
  const response = await apiClient.post<{
    authorization: ParentAuthorization;
  }>("/api/v1/parents/me/authorizations", input);

  return response.data;
}
