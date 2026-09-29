import { apiClient } from "../api/client";
import type {
  AttendanceEventType,
  ParentSummons,
  SurveillantAttendanceItem,
  SurveillantDashboardResponse,
} from "./surveillant.types";

export async function getDashboard(): Promise<SurveillantDashboardResponse> {
  const response = await apiClient.get<SurveillantDashboardResponse>(
    "/api/v1/surveillant/dashboard",
  );
  return response.data;
}

export async function getClasses(params?: import("./surveillant.types").SurveillantClassFilters & { limit?: number }): Promise<{
  items: import("./surveillant.types").SurveillantClassOption[];
  total: number;
  hasMore: boolean;
}> {
  const response = await apiClient.get("/api/v1/surveillant/classes", { params });
  return response.data;
}

export async function getAttendance(params?: {
  date?: string;
  classId?: string;
}): Promise<{ date: string; attendance: SurveillantAttendanceItem[] }> {
  const response = await apiClient.get(
    "/api/v1/surveillant/attendance",
    { params },
  );
  return response.data;
}

export async function createAttendanceEvent(
  studentId: string,
  attendanceId: string,
  type: AttendanceEventType,
  note?: string | null,
): Promise<void> {
  await apiClient.post(
    `/api/v1/surveillant/events/${studentId}`,
    { attendanceId, type, note: note ?? null },
  );
}

export async function createParentSummons(
  studentId: string,
  payload: {
    attendanceEventId?: string | null;
    reason: import("./surveillant.types").ParentSummonsReason;
    message: string;
    scheduledAt?: string | null;
    parentId?: string;
  },
): Promise<ParentSummons[]> {
  const response = await apiClient.post<{ summons: ParentSummons[] }>(
    `/api/v1/surveillant/summons/${studentId}`,
    payload,
  );
  return response.data.summons;
}


export type SurveillantSummonsNotification = {
  id: string;
  studentId: string;
  reason: string;
  message: string;
  status: "ACCEPTED" | "DECLINED" | "COMPLETED";
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  responseReadAt: string | null;
  student: { firstName: string; lastName: string };
};

export async function getSummonsNotifications(): Promise<{
  items: SurveillantSummonsNotification[];
  unreadCount: number;
}> {
  const response = await apiClient.get("/api/v1/surveillant/notifications/summons");
  return response.data;
}

export async function markSummonsNotificationRead(
  summonsId: string,
): Promise<void> {
  await apiClient.patch(
    `/api/v1/surveillant/notifications/summons/${summonsId}/read`,
  );
}
