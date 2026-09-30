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


export type CreateStudentInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  studentNumber: string;
  dateOfBirth?: string | null;
  classId: string;
  gender: "MALE" | "FEMALE";
};

export type BulkStudentInput = Omit<CreateStudentInput, "classId"> & {
  classId?: string;
  className?: string;
};

export type UpdatePersonnelInput = {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  function: StaffFunction;
};

export type BulkPersonnelInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  function: StaffFunction;
};


export type SchoolAdminDisciplinaryAction = {
  id: string;
  studentId: string;
  incidentId: string | null;
  type: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  description: string;
  decisionNote: string | null;
  actionAt: string;
  dueAt: string | null;
  completedAt: string | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  completedBy: string | null;
  student: {
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
};

export type SchoolAdminDisciplinaryActionsResponse = {
  items: SchoolAdminDisciplinaryAction[];
};

export type UpdateSchoolAdminDisciplinaryActionInput = {
  approvalStatus?: "APPROVED" | "REJECTED";
  decisionNote?: string | null;
};
