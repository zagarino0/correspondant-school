export type SchoolAdminDashboardResponse = {
  school: {
    id: string;
    code: string;
    name: string;
    status: string;
  };
  academicYear: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  counts: {
    students: number;
    teachers: number;
    classes: number;
    staff: number;
  };
  classes: Array<{
    id: string;
    name: string;
    level: string | null;
    studentCount: number;
  }>;
  personnel: Array<{
    id: string;
    assignmentId: string;
    firstName: string;
    lastName: string;
    email: string;
    function: string;
    status: string;
  }>;
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    recorded: number;
  };
  communication: {
    announcements: number;
    unreadMessages: number;
  };
};


export type CreateClassInput = {
  name: string;
  level: string;
};

export type CreateTeacherInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type StaffFunction =
  | "ADMINISTRATION"
  | "SURVEILLANT"
  | "SECRETARIAT"
  | "COMPTABILITE"
  | "INFIRMIER";

export type CreatePersonnelInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  function: StaffFunction;
};

export type UpdateClassInput = {
  name: string;
  level: string;
};

export type ScheduleDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export type CreateScheduleInput = {
  classId: string;
  teacherId: string;
  subject: string;
  dayOfWeek: ScheduleDay;
  startTime: string;
  endTime: string;
  room?: string | null;
};

export type SchoolAdminSchedule = {
  id: string;
  classId: string;
  teacherId: string;
  subject: string;
  dayOfWeek: ScheduleDay;
  startTime: string;
  endTime: string;
  room: string | null;
  class: {
    id: string;
    name: string;
    level: string | null;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type SchoolAdminSchedulesResponse = {
  academicYear: {
    id: string;
    name: string;
    status: string;
  };
  schedules: SchoolAdminSchedule[];
};
