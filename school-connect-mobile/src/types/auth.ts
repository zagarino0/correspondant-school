export type StaffFunction =
  | "ADMINISTRATION"
  | "SURVEILLANT"
  | "SECRETARIAT"
  | "COMPTABILITE"
  | "INFIRMIER";

export type UserRole =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "PARENT"
  | "STUDENT"
  | "STAFF";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId?: string | null;
  staffFunction?: StaffFunction | null;
  permissions?: string[];
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};