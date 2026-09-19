export type StudentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type StudentGender = "MALE" | "FEMALE";

export type StudentListItem = {
  id: string;
  schoolId: string;
  userId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: StudentGender | null;
  classPosition: string | null;
  status: StudentStatus;
  user: {
    email: string;
    status: string;
  };
  enrollments: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    class: {
      id: string;
      name: string;
      level: string;
    };
    academicYear: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
};

export type StudentListResponse = {
  students: StudentListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type GetStudentsParams = {
  search?: string;
  classId?: string;
  status?: StudentStatus;
  page?: number;
  pageSize?: number;
};

export type StudentDetail = {
  id: string;
  schoolId: string;
  userId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: StudentGender | null;
  status: StudentStatus;
  user: {
    id: string;
    email: string;
    status: string;
  };
  enrollments: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    endedAt: string | null;
    class: {
      id: string;
      name: string;
      level: string | null;
    };
    academicYear: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      status: string;
    };
  }>;
  parents: Array<{
    id: string;
    relationship: string;
    isPrimary: boolean;
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      status: string;
    };
  }>;
  medicalRecord: {
    id: string;
    bloodGroup: string | null;
    allergies: string | null;
    medicalConditions: string | null;
    medications: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    doctorName: string | null;
    doctorPhone: string | null;
    notes: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentDetailResponse = {
  student: StudentDetail;
};

export type StudentClassOption = {
  id: string;
  name: string;
  level: string | null;
  academicYear: {
    id: string;
    name: string;
  };
};

export type StudentClassesResponse = {
  classes: StudentClassOption[];
};

export type UpdateStudentResponse = {
  student: StudentDetail & {
    email: string;
    userStatus: string;
  };
};

export type UpdateStudentInput = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  studentNumber?: string;
  dateOfBirth?: string | null;
  status?: StudentStatus;
  classId?: string | null;
  gender?: StudentGender;
};
