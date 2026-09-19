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

export type ParentScheduleDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type ParentChildSchedule = {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  teacherId: string;
  subject: string;
  dayOfWeek: ParentScheduleDay;
  startTime: string;
  endTime: string;
  room: string | null;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type ParentChildScheduleResponse = {
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
  enrollment: {
    id: string;
    academicYear: {
      id: string;
      name: string;
    };
    class: {
      id: string;
      name: string;
      level: string;
    };
  };
  schedules: ParentChildSchedule[];
};

export async function getMyChildren(): Promise<ParentChildrenResponse> {
  const response = await apiClient.get<ParentChildrenResponse>(
    "/api/v1/parents/me/children",
  );

  return response.data;
}

export async function getChildSchedule(
  studentId: string,
): Promise<ParentChildScheduleResponse> {
  const response = await apiClient.get<ParentChildScheduleResponse>(
    `/api/v1/parents/me/children/${studentId}/schedule`,
  );

  return response.data;
}
