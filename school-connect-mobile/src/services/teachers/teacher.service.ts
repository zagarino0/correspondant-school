import { apiClient } from "../api/client";
import type {
  SchoolTeachersResponse,
  TeacherClassDetailResponse,
  TeacherClassesResponse,
} from "./teacher.types";

export async function getSchoolTeachers(): Promise<SchoolTeachersResponse> {
  const response = await apiClient.get<SchoolTeachersResponse>(
    "/api/v1/teachers",
  );

  return response.data;
}

export async function getTeacherClasses(): Promise<TeacherClassesResponse> {
  const response = await apiClient.get<TeacherClassesResponse>(
    "/api/v1/teachers/me/classes",
  );

  return response.data;
}

export async function getTeacherClass(
  classId: string,
): Promise<TeacherClassDetailResponse> {
  const response = await apiClient.get<TeacherClassDetailResponse>(
    `/api/v1/teachers/me/classes/${classId}`,
  );

  return response.data;
}
