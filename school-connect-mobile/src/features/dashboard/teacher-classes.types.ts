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
  } | null;
};

export type TeacherAttendanceResponse = {
  date: string;
  classId: string;
  students: TeacherAttendanceRow[];
};
