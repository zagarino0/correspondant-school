import { apiClient } from "../api/client";
import type { SchoolTeachersResponse } from "./teacher.types";

export async function getSchoolTeachers(): Promise<SchoolTeachersResponse> {
  const response = await apiClient.get<SchoolTeachersResponse>(
    "/api/v1/teachers",
  );

  return response.data;
}
