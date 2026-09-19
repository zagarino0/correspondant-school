export type ScheduleDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type StudentSchedule = {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  teacherId: string;
  subject: string;
  dayOfWeek: ScheduleDay;
  startTime: string;
  endTime: string;
  room: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentScheduleStudent = {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
};

export type StudentScheduleEnrollment = {
  id: string;
  academicYearId: string;
  classId: string;
  status: "ACTIVE";
  academicYear: {
    id: string;
    name: string;
    status: "ACTIVE";
  };
  class: {
    id: string;
    name: string;
    level: string;
    schoolId: string;
  };
};

export type StudentScheduleResponse = {
  student: StudentScheduleStudent;
  enrollment: StudentScheduleEnrollment;
  schedules: StudentSchedule[];
};

export type StudentNextScheduleResponse = {
  student: StudentScheduleStudent;
  enrollment: StudentScheduleEnrollment;
  schedule: StudentSchedule;
};


export type TeacherSchedule = {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  teacherId: string;
  subject: string;
  dayOfWeek: ScheduleDay;
  startTime: string;
  endTime: string;
  room: string | null;
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    name: string;
    level: string;
  };
};

export type TeacherScheduleResponse = {
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    schoolId: string | null;
  };
  schedules: TeacherSchedule[];
};
