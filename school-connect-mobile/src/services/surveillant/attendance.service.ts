import { apiClient } from "../api/client";

export type SurveillantAttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export type SurveillantAttendanceStudent = {
  enrollmentId: string;
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  attendance: {
    id: string;
    studentId: string;
    status: SurveillantAttendanceStatus;
    arrivalTime: string | null;
    reason: string | null;
    note: string | null;
    recordedBy: string;
    updatedAt: string;
  } | null;
};

export type SurveillantAttendanceSession = {
  date: string;
  schedule: {
    id: string;
    classId: string;
    subject: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    room: string | null;
    class: { id: string; name: string; level: string | null };
    teacher: { id: string; firstName: string; lastName: string };
  };
  students: SurveillantAttendanceStudent[];
};

export async function getSurveillantAttendanceSession(
  scheduleId: string,
  date: string,
): Promise<SurveillantAttendanceSession> {
  const response = await apiClient.get<SurveillantAttendanceSession>(
    "/api/v1/surveillant/school-life/attendance/session",
    { params: { scheduleId, date } },
  );
  return response.data;
}

export async function createSurveillantLateAttendance(input: {
  scheduleId: string;
  date: string;
  studentId: string;
  arrivalTime: string;
  reason?: string | null;
  note?: string | null;
}) {
  const response = await apiClient.post(
    "/api/v1/surveillant/school-life/attendance/session/late",
    input,
  );
  return response.data as {
    item: {
      id: string;
      studentId: string;
      status: "LATE";
      arrivalTime: string | null;
      reason: string | null;
      note: string | null;
      recordedBy: string;
      updatedAt: string;
    };
  };
}

export async function updateSurveillantLateAttendance(
  attendanceId: string,
  input: {
    arrivalTime?: string | null;
    reason?: string | null;
    note?: string | null;
  },
) {
  const response = await apiClient.patch(
    `/api/v1/surveillant/school-life/attendance/session/late/${attendanceId}`,
    input,
  );
  return response.data as {
    item: {
      id: string;
      studentId: string;
      status: "LATE";
      arrivalTime: string | null;
      reason: string | null;
      note: string | null;
      recordedBy: string;
      updatedAt: string;
    };
  };
}
