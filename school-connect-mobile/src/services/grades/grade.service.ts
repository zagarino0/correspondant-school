import { apiClient } from "../api/client";

export type ParentGrade = {
  id: string;
  enrollmentId: string;
  subject: string;
  title: string;
  value: number;
  maxValue: number;
  coefficient: number;
  evaluationDate: string;
  comment: string | null;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
  recorder: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type ParentGradesResponse = {
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
  grades: ParentGrade[];
};

export async function getStudentGrades(
  studentId: string,
): Promise<ParentGradesResponse> {
  const response = await apiClient.get<ParentGradesResponse>(
    `/api/v1/grades/student/${studentId}`,
  );

  return response.data;
}
