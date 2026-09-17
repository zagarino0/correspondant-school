export type AnnouncementAcademicYear = {
  id: string;
  name: string;
  status: "ACTIVE";
};

export type AnnouncementCreator = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

export type AnnouncementClass = {
  id: string;
  name: string;
  level: string;
};

export type StudentAnnouncement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
  readAt: string | null;
  recipientId: string;
  recipientCreatedAt: string;
  creator: AnnouncementCreator;
  classes: AnnouncementClass[];
};

export type StudentAnnouncementsResponse = {
  academicYear: AnnouncementAcademicYear;
  count: number;
  announcements: StudentAnnouncement[];
};
