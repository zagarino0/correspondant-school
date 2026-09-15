import type { Role } from "./roles.js";

export interface AuthorizedContext {
  userId: string;
  role: Role;
  schoolId: string | null;

  childUserIds: string[];
  assignedSchoolIds: string[];
  assignedClassIds: string[];
}
