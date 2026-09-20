import { apiClient } from "../api/client";
import type {
  CreateClassInput,
  CreateScheduleInput,
  SchoolAdminSchedulesResponse,
  UpdateClassInput,
  CreatePersonnelInput,
  CreateTeacherInput,
  SchoolAdminDashboardResponse,
  CreateStudentInput,
  BulkStudentInput,
  UpdatePersonnelInput,
  BulkPersonnelInput,
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

export async function updateSchoolClass(
  classId: string,
  input: UpdateClassInput,
) {
  const response = await apiClient.patch(
    `/api/v1/school-admin/classes/${classId}`,
    input,
  );
  return response.data;
}

export async function deleteSchoolClass(classId: string) {
  const response = await apiClient.delete(
    `/api/v1/school-admin/classes/${classId}`,
  );
  return response.data;
}

export async function getSchoolAdminSchedules(): Promise<SchoolAdminSchedulesResponse> {
  const response = await apiClient.get<SchoolAdminSchedulesResponse>(
    "/api/v1/school-admin/schedules",
  );
  return response.data;
}

export async function createSchoolSchedule(input: CreateScheduleInput) {
  const response = await apiClient.post(
    "/api/v1/school-admin/schedules",
    input,
  );
  return response.data;
}

export async function updateSchoolSchedule(
  scheduleId: string,
  input: CreateScheduleInput,
) {
  const response = await apiClient.patch(
    `/api/v1/school-admin/schedules/${scheduleId}`,
    input,
  );
  return response.data;
}

export async function deleteSchoolSchedule(scheduleId: string) {
  const response = await apiClient.delete(
    `/api/v1/school-admin/schedules/${scheduleId}`,
  );
  return response.data;
}


export async function createSchoolStudent(input: CreateStudentInput) {
  const response = await apiClient.post("/api/v1/students", input);
  return response.data;
}

export async function bulkCreateSchoolStudents(students: BulkStudentInput[]) {
  const response = await apiClient.post("/api/v1/students/bulk", { students });
  return response.data;
}

export async function updateSchoolPersonnel(
  assignmentId: string,
  input: UpdatePersonnelInput,
) {
  const response = await apiClient.patch(
    `/api/v1/school-admin/personnel/${assignmentId}`,
    input,
  );
  return response.data;
}

export async function deleteSchoolPersonnel(assignmentId: string) {
  const response = await apiClient.delete(
    `/api/v1/school-admin/personnel/${assignmentId}`,
  );
  return response.data;
}

export async function bulkCreateSchoolPersonnel(
  personnel: BulkPersonnelInput[],
) {
  const response = await apiClient.post(
    "/api/v1/school-admin/personnel/bulk",
    { personnel },
  );
  return response.data;
}
