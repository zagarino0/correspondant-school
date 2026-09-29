export type TeacherClass = {
  id: string;
  name: string;
  level: string | null;
  academicYearId: string;
  academicYear: {
    id: string;
    name: string;
    status: string;
  };
  studentCount: number;
};

export type TeacherClassStudent = {
  enrollmentId: string;
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    status?: string;
  };
};

export type TeacherClassesResponse = {
  classes: TeacherClass[];
};

export type TeacherClassDetailsResponse = {
  class: Omit<TeacherClass, "studentCount">;
  students: TeacherClassStudent[];
};

export type TeacherAttendanceRow = {
  enrollmentId: string;
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
  attendance: {
    id: string;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    arrivalTime: string | null;
    reason: string | null;
    note: string | null;
    recordedBy: string;
    events: Array<{
      id: string;
      type: "LATE_AUTHORIZED" | "LATE_NOT_AUTHORIZED" | "ABSENCE_JUSTIFIED" | "ABSENCE_UNJUSTIFIED";
      note: string | null;
      createdAt: string;
    }>;
  } | null;
};

export type TeacherAttendanceResponse = {
  date: string;
  classId: string;
  students: TeacherAttendanceRow[];
};


export type TeacherObservation = {
  id: string;
  scheduleId: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  schedule: {
    subject: string;
    startTime: string;
    endTime: string;
    room: string | null;
    class: {
      id: string;
      name: string;
      level: string | null;
    };
  };
};

export type TeacherObservationsResponse = {
  observations: TeacherObservation[];
};
