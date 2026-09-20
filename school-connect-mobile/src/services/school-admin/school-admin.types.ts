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
