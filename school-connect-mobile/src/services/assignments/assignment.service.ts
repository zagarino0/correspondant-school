import { apiClient } from "../api/client";
import type { StudentAssignmentsResponse, TeacherAssignmentsResponse } from "../../features/assignments/assignment.types";

export async function getMyAssignments(): Promise<StudentAssignmentsResponse> {
  const response = await apiClient.get<StudentAssignmentsResponse>(
    "/api/v1/assignments/me",
  );

  return response.data;
}


export async function getTeacherAssignments(
  scheduleId: string,
): Promise<TeacherAssignmentsResponse> {
  const response = await apiClient.get<TeacherAssignmentsResponse>(
    "/api/v1/assignments/teacher",
    { params: { scheduleId } },
  );

  return response.data;
}
