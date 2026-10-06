import type { Permission } from "./permissions.js";
import { permissions } from "./permissions.js";

export type Role =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "PARENT"
  | "STUDENT"
  | "STAFF";

const allPermissions: readonly Permission[] = permissions;

export const rolePermissions: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: allPermissions,

  SCHOOL_ADMIN: [
    "student.read",
    "student.create",
    "student.update",
    "student.delete",

    "grade.read",
    "grade.create",
    "grade.update",
    "grade.delete",

    "attendance.read",
    "attendance.create",
    "attendance.update",
    "attendance.delete",

    "incident.read",
    "incident.create",
    "incident.update",

    "disciplinary-action.read",
    "disciplinary-action.create",
    "disciplinary-action.update",
    "disciplinary-action.delete",

    "assignment.read",
    "assignment.create",
    "assignment.update",
    "assignment.delete",

    "schedule.read",
    "schedule.create",
    "schedule.update",
    "schedule.delete",

    "message.read",
    "message.send",

    "announcement.read",
    "announcement.create",
    "announcement.update",
    "announcement.delete",

    "document.read",
    "document.create",
    "document.delete",

    "meeting.read",
    "meeting.create",
    "meeting.update",
    "meeting.delete",

    "authorization.read",
    "authorization.create",
    "authorization.update",

    "payment.read",
    "payment.create",
    "payment.update",
    "invoice.read",
    "invoice.create",
    "invoice.update",
    "payment-allocation.read",
    "payment-allocation.create",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
    "school.update",

    "user.read",
    "user.create",
    "user.update",
    "user.delete",
  ],

  TEACHER: [
    "student.read",

    "grade.read",
    "grade.create",
    "grade.update",

    "attendance.read",
    "attendance.create",
    "attendance.update",

    "observation.read",
    "observation.create",

    "incident.read",
    "incident.create",

    "assignment.read",
    "assignment.create",
    "assignment.update",

    "schedule.read",

    "message.read",
    "message.send",

    "announcement.read",

    "document.read",

    "meeting.read",
    "meeting.create",
    "meeting.update",

    "ticket.read",
    "ticket.create",
    "ticket.update",
  ],

  PARENT: [
    "student.read",

    "grade.read",

    "attendance.read",

    "assignment.read",

    "schedule.read",

    "message.read",
    "message.send",

    "announcement.read",

    "document.read",

    "meeting.read",
    "meeting.create",
    "meeting.update",

    "authorization.read",
    "authorization.create",
    "authorization.update",

    "payment.read",
    "payment.create",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
  ],

  STUDENT: [
  "student.read",

  "grade.read",

  "assignment.read",

  "schedule.read",

  "document.read",

  "message.read",
  "message.send",

  "announcement.read",

  "meeting.read",

  "ticket.read",
  "ticket.create",
],

  STAFF: [
    "student.read",

    "attendance.read",

    "assignment.read",

    "schedule.read",

    "message.read",
    "message.send",

    "announcement.read",

    "document.read",

    "meeting.read",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
  ],
};

export function hasPermission(
  role: Role,
  permission: Permission
): boolean {
  return rolePermissions[role].includes(permission);
}