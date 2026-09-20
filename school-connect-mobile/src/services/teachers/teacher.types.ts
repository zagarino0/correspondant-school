export type TeacherClassSummary = {
  id: string;
  name: string;
  level: string | null;
};

export type TeacherClass = TeacherClassSummary & {
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
  studentId: string;
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    status: string;
  };
};

export type TeacherClassesResponse = {
  classes: TeacherClass[];
};

export type TeacherClassDetailResponse = {
  class: Omit<TeacherClass, "studentCount">;
  students: TeacherClassStudent[];
};

export type SchoolTeacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  classes: TeacherClassSummary[];
};

export type SchoolTeachersResponse = {
  academicYear: {
    id: string;
    name: string;
  };
  teachers: SchoolTeacher[];
};
