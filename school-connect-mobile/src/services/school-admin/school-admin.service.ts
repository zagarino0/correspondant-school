import { apiClient } from "../api/client";
import type {
  CreateClassInput,
  CreatePersonnelInput,
  CreateTeacherInput,
  SchoolAdminDashboardResponse,
} from "./school-admin.types";

export async function getSchoolAdminDashboard(): Promise<SchoolAdminDashboardResponse> {
  const response = await apiClient.get<SchoolAdminDashboardResponse>(
    "/api/v1/school-admin/dashboard",
  );

  return response.data;
}

export async function createSchoolClass(input: CreateClassInput) {
  const response = await apiClient.post("/api/v1/school-admin/classes", input);
  return response.data;
}

export async function createTeacher(input: CreateTeacherInput) {
  const response = await apiClient.post("/api/v1/school-admin/teachers", input);
  return response.data;
}

export async function createPersonnel(input: CreatePersonnelInput) {
  const response = await apiClient.post("/api/v1/school-admin/personnel", input);
  return response.data;
}
