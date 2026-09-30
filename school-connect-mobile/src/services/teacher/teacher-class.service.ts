import { apiClient } from "../api/client";
import type {
  TeacherAttendanceResponse,
  TeacherClassDetailsResponse,
  TeacherClassesResponse,
  TeacherObservationsResponse,
} from "../../features/dashboard/teacher-classes.types";

export async function getTeacherClasses(): Promise<TeacherClassesResponse> {
  const response = await apiClient.get<TeacherClassesResponse>(
    "/api/v1/teachers/me/classes",
  );
  return response.data;
}

export async function getTeacherClass(
  classId: string,
): Promise<TeacherClassDetailsResponse> {
  const response = await apiClient.get<TeacherClassDetailsResponse>(
    `/api/v1/teachers/me/classes/${classId}`,
  );
  return response.data;
}

export async function getTeacherAttendance(
  classId: string,
  scheduleId: string,
  date: string,
): Promise<TeacherAttendanceResponse> {
  const response = await apiClient.get<TeacherAttendanceResponse>(
    `/api/v1/teachers/me/classes/${classId}/attendance`,
    { params: { date, scheduleId } },
  );
  return response.data;
}

export async function saveTeacherAttendance(
  classId: string,
  payload: {
    enrollmentId: string;
    scheduleId: string;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    arrivalTime?: string | null;
    reason?: string | null;
    note?: string | null;
  },
) {
  const response = await apiClient.post(
    `/api/v1/teachers/me/classes/${classId}/attendance`,
    payload,
  );
  return response.data;
}

export async function createTeacherAssignment(payload: {
  classId: string;
  subject: string;
  title: string;
  description?: string | null;
  assignedAt: string;
  dueDate?: string | null;
}) {
  const response = await apiClient.post(
    "/api/v1/assignments",
    payload,
  );
  return response.data;
}


export async function getTeacherObservations(
  date?: string,
): Promise<TeacherObservationsResponse> {
  const response = await apiClient.get<TeacherObservationsResponse>(
    "/api/v1/teachers/me/observations",
    date ? { params: { date } } : undefined,
  );
  return response.data;
}

export async function saveTeacherObservation(payload: {
  scheduleId: string;
  date: string;
  content: string;
}) {
  const response = await apiClient.post(
    "/api/v1/teachers/me/observations",
    payload,
  );
  return response.data;
}
