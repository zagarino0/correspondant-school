import { apiClient } from "../api/client";

export type ParentChildEnrollment = {
  id: string;
  status: string;
  class: {
    id: string;
    name: string;
    level: string | null;
  };
  academicYear: {
    id: string;
    name: string;
  };
};

export type ParentChild = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  relationship: string | null;
  isPrimary: boolean;
  enrollment: ParentChildEnrollment | null;
};

export type ParentChildrenResponse = {
  children: ParentChild[];
};

export async function getMyChildren(): Promise<ParentChildrenResponse> {
  const response = await apiClient.get<ParentChildrenResponse>(
    "/api/v1/parents/me/children",
  );

  return response.data;
}
