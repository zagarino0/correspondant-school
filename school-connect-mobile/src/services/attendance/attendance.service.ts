import { apiClient } from "../api/client";

export type ParentAttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED";

export type AttendanceEvent = {
  id: string;
  type: "LATE_AUTHORIZED" | "LATE_NOT_AUTHORIZED" | "ABSENCE_JUSTIFIED" | "ABSENCE_UNJUSTIFIED";
  note: string | null;
  createdAt: string;
};

export type ParentAttendanceRecord = {
  id: string;
  date: string;
  status: ParentAttendanceStatus;
  arrivalTime: string | null;
  reason: string | null;
  note: string | null;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
  events: AttendanceEvent[];
  recorder: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type ParentAttendanceResponse = {
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
  attendance: ParentAttendanceRecord[];
};

export async function getMyAttendance(): Promise<ParentAttendanceResponse> {
  const response = await apiClient.get<ParentAttendanceResponse>(
    "/api/v1/attendance/me",
  );

  return response.data;
}

export async function getStudentAttendance(
  studentId: string,
): Promise<ParentAttendanceResponse> {
  const response = await apiClient.get<ParentAttendanceResponse>(
    `/api/v1/attendance/student/${studentId}`,
  );

  return response.data;
}
