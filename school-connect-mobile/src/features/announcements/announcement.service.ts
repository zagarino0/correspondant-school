import { apiClient } from "../../services/api/client";
import type { StudentAnnouncementsResponse } from "./announcement.types";

export async function getMyAnnouncements(): Promise<StudentAnnouncementsResponse> {
  const response = await apiClient.get<StudentAnnouncementsResponse>(
    "/api/v1/announcements/me",
  );

  return response.data;
}
