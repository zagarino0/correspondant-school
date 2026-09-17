export type AssignmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "LATE"
  | "CANCELLED";

export type StudentAssignment = {
  id: string;
  studentId: string | null;
  classId: string;
  subject: string;
  title: string;
  description: string | null;
  assignedAt: string;
  dueDate: string | null;
  status: AssignmentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    name: string;
    level: string;
  };
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};

export type StudentAssignmentStudent = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
};

export type StudentAssignmentEnrollment = {
  id: string;
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

export type StudentAssignmentsResponse = {
  student: StudentAssignmentStudent;
  enrollment: StudentAssignmentEnrollment;
  count: number;
  assignments: StudentAssignment[];
};
