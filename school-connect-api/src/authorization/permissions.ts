export const permissions = [
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
  "attendance-late.create",
  "attendance-late.update",
  "attendance.delete",

  "attendance-event.read",
  "attendance-event.create",

  "parent-summons.read",
  "parent-summons.create",
  "parent-summons.update",

  "student-exit.read",
  "student-exit.create",
  "student-exit.update",

  "student-movement.read",
  "student-movement.create",
  "student-movement.update",

  "incident.read",
  "incident.create",
  "incident.update",

  "disciplinary-action.read",
  "disciplinary-action.create",
  "disciplinary-action.update",

  "observation.read",
  "observation.create",

  "alert.read",
  "alert.create",

  "daily-report.read",
  "daily-report.create",

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

  "ticket.read",
  "ticket.create",
  "ticket.update",

  "school.read",
  "school.update",

  "user.read",
  "user.create",
  "user.update",
  "user.delete",
] as const;

export type Permission = (typeof permissions)[number];
