import { apiClient } from "../api/client";
import type { StudentScheduleResponse } from "../../features/schedule/schedule.types";

export async function getMySchedule(): Promise<StudentScheduleResponse> {
  const response = await apiClient.get<StudentScheduleResponse>(
    "/api/v1/schedules/me",
  );

  return response.data;
}
