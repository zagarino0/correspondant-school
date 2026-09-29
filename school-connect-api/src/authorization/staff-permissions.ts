import type { Permission } from "./permissions.js";
import type { StaffFunction } from "@prisma/client";

const staffPermissions: Record<StaffFunction, readonly Permission[]> = {
  ADMINISTRATION: [
    "student.read",
    "student.create",
    "student.update",
    "student.delete",

    "grade.read",
    "grade.create",
    "grade.update",

    "attendance.read",
    "attendance.create",
    "attendance.update",

    "assignment.read",
    "assignment.create",
    "assignment.update",

    "schedule.read",
    "schedule.create",
    "schedule.update",

    "message.read",
    "message.send",

    "announcement.read",
    "announcement.create",
    "announcement.update",

    "document.read",
    "document.create",

    "meeting.read",
    "meeting.create",
    "meeting.update",

    "authorization.read",
    "authorization.create",
    "authorization.update",

    "payment.read",
    "payment.create",
    "payment.update",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
    "school.update",

    "user.read",
    "user.create",
    "user.update",
  ],

  SURVEILLANT: [
    "student.read",

    "attendance.read",

    "attendance-event.read",
    "attendance-event.create",

    "parent-summons.read",
    "parent-summons.create",

    "schedule.read",

    "message.read",
    "message.send",

    "announcement.create",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
  ],

  SECRETARIAT: [
    "student.read",
    "student.create",
    "student.update",

    "attendance.read",

    "schedule.read",

    "message.read",
    "message.send",

    "announcement.read",

    "document.read",
    "document.create",

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

    "user.read",
    "user.create",
    "user.update",
  ],

  COMPTABILITE: [
    "student.read",

    "document.read",

    "payment.read",
    "payment.create",
    "payment.update",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
  ],

  INFIRMIER: [
    "student.read",

    "document.read",

    "message.read",
    "message.send",

    "ticket.read",
    "ticket.create",
    "ticket.update",

    "school.read",
  ],
};

export function hasStaffPermission(
  staffFunction: StaffFunction,
  permission: Permission
): boolean {
  return staffPermissions[staffFunction].includes(permission);
}

export function getStaffPermissions(
  staffFunction: StaffFunction
): readonly Permission[] {
  return staffPermissions[staffFunction];
}
