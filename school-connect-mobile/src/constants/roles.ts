export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  TEACHER: "TEACHER",
  PARENT: "PARENT",
  STUDENT: "STUDENT",
  STAFF: "STAFF"
} as const;

export type UserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];