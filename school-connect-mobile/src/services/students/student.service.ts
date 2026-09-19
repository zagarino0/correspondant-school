import { apiClient } from "../api/client";
import type {
  GetStudentsParams,
  StudentListResponse,
} from "./student.types";

export async function getStudents(
  params: GetStudentsParams = {},
): Promise<StudentListResponse> {
  const response = await apiClient.get<StudentListResponse>(
    "/api/v1/students",
    { params },
  );

  return response.data;
}
