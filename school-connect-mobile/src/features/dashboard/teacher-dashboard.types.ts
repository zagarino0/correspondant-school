import type { ScheduleDay } from "../schedule/schedule.types";

export type TeacherDashboardClass = {
  id: string;
  name: string;
  level: string | null;
  academicYearId: string;
};

export type TeacherDashboardSchedule = {
  id: string;
  classId: string;
  subject: string;
  startTime: string;
  endTime: string;
  room: string | null;
};

export type TeacherDashboardResponse = {
  date: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
  classes: TeacherDashboardClass[];
  today: {
    dayOfWeek: ScheduleDay;
    schedules: TeacherDashboardSchedule[];
    scheduleCount: number;
  };
  assignments: {
    pendingCount: number;
  };
  observations: {
    count: number;
  };
  attendance: {
    studentsToRecordCount: number;
    recordedCount: number;
    totalStudents: number;
  };
};
