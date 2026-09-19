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
