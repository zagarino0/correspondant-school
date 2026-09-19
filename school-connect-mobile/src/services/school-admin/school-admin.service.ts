import { apiClient } from "../api/client";
import type { SchoolAdminDashboardResponse } from "./school-admin.types";

export async function getSchoolAdminDashboard(): Promise<SchoolAdminDashboardResponse> {
  const response = await apiClient.get<SchoolAdminDashboardResponse>(
    "/api/v1/school-admin/dashboard",
  );

  return response.data;
}
