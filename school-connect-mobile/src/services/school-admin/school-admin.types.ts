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
