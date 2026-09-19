import { apiClient } from "../api/client";

export type ParentAttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED";

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

export async function getStudentAttendance(
  studentId: string,
): Promise<ParentAttendanceResponse> {
  const response = await apiClient.get<ParentAttendanceResponse>(
    `/api/v1/attendance/student/${studentId}`,
  );

  return response.data;
}
