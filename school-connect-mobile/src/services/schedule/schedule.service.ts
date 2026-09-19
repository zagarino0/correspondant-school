import { apiClient } from "../api/client";
import type {
  StudentNextScheduleResponse,
  StudentScheduleResponse,
  TeacherScheduleResponse,
} from "../../features/schedule/schedule.types";

export async function getMySchedule(): Promise<StudentScheduleResponse> {
  const response = await apiClient.get<StudentScheduleResponse>(
    "/api/v1/schedules/me",
  );

  return response.data;
}

export async function getMyNextSchedule(): Promise<StudentNextScheduleResponse> {
  const response = await apiClient.get<StudentNextScheduleResponse>(
    "/api/v1/schedules/me/next",
  );

  return response.data;
}

export async function getMyTeacherSchedule(): Promise<TeacherScheduleResponse> {
  const response = await apiClient.get<TeacherScheduleResponse>(
    "/api/v1/schedules/teacher/me",
  );

  return response.data;
}
