import { apiClient } from "../api/client";
import type { StudentAssignmentsResponse } from "../../features/assignments/assignment.types";

export async function getMyAssignments(): Promise<StudentAssignmentsResponse> {
  const response = await apiClient.get<StudentAssignmentsResponse>(
    "/api/v1/assignments/me",
  );

  return response.data;
}
