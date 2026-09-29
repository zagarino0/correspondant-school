export type AttendanceEventType =
  | "LATE_AUTHORIZED"
  | "LATE_NOT_AUTHORIZED"
  | "ABSENCE_JUSTIFIED"
  | "ABSENCE_UNJUSTIFIED";

export type SurveillantSession = {
  scheduleId: string;
  classId: string;
  className: string;
  subject: string;
  teacher: { id: string; firstName: string; lastName: string } | null;
  startTime: string;
  endTime: string;
  room: string | null;
};

export type SurveillantAttendanceSummary = {
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  recorded: boolean;
};

export type SurveillantDashboardResponse = {
  school: { id: string };
  summary: {
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
  };
  currentSession: (SurveillantSession & {
    attendance: SurveillantAttendanceSummary;
  }) | null;
  attendanceToControl: Array<SurveillantSession & {
    attendance: SurveillantAttendanceSummary;
  }>;
  lateArrivals: Array<{
    id: string;
    attendanceId: string;
    type: AttendanceEventType | null;
    note: string | null;
    createdAt: string;
    student: { id: string; firstName: string; lastName: string };
    attendance: { arrivalTime: string | null };
  }>;
  absenceItems: Array<{
    id: string;
    attendanceId: string;
    student: { id: string; firstName: string; lastName: string };
    reason: string | null;
    note: string | null;
    latestEvent: {
      id: string;
      type: AttendanceEventType;
      note: string | null;
      createdAt: string;
    } | null;
  }>;
  upcomingSessions: Array<SurveillantSession & {
    attendance: SurveillantAttendanceSummary;
  }>;
};

export type SurveillantAttendanceItem = {
  id: string;
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  arrivalTime: string | null;
  reason: string | null;
  note: string | null;
  student: { id: string; firstName: string; lastName: string };
  events: Array<{
    id: string;
    type: AttendanceEventType;
    note: string | null;
    createdAt: string;
  }>;
};

export type ParentSummons = {
  id: string;
  studentId: string;
  parentId?: string;
  reason: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED";
  scheduledAt?: string | null;
  createdAt: string;
};

export type SurveillantClassCategory = "primaire" | "premier-cycle" | "deuxieme-cycle";

export type SurveillantClassOption = {
  id: string;
  name: string;
  level: string | null;
  studentCount: number;
};

export type SurveillantClassFilters = {
  search?: string;
  level?: string;
  category?: SurveillantClassCategory;
};
