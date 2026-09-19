import { apiClient } from "../api/client";
import type { TeacherDashboardResponse } from "../../features/dashboard/teacher-dashboard.types";

export async function getTeacherDashboard(
  date: string,
): Promise<TeacherDashboardResponse> {
  const response = await apiClient.get<TeacherDashboardResponse>(
    "/api/v1/teachers/me/dashboard",
    {
      params: { date },
    },
  );

  return response.data;
}
