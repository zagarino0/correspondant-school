import { apiClient } from "../api/client";
import type {
  GetStudentsParams,
  StudentClassesResponse,
  StudentDetailResponse,
  StudentListResponse,
  UpdateStudentInput,
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

export async function getStudent(
  studentId: string,
): Promise<StudentDetailResponse> {
  const response = await apiClient.get<StudentDetailResponse>(
    `/api/v1/students/${studentId}`,
  );

  return response.data;
}

export async function getStudentClasses(): Promise<StudentClassesResponse> {
  const response = await apiClient.get<StudentClassesResponse>(
    "/api/v1/students/classes",
  );

  return response.data;
}

export async function updateStudent(
  studentId: string,
  data: UpdateStudentInput,
): Promise<StudentDetailResponse> {
  const response = await apiClient.patch<StudentDetailResponse>(
    `/api/v1/students/${studentId}`,
    data,
  );

  return response.data;
}
