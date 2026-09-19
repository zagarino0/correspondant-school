export type TeacherClassSummary = {
  id: string;
  name: string;
  level: string | null;
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
