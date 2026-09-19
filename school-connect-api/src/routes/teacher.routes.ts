import type { FastifyInstance } from "fastify";
import { AssignmentStatus, ScheduleDay } from "@prisma/client";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeResource } from "../middleware/authorize-resource.js";

function getDateRange(date: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    throw new Error("INVALID_DATE");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = new Date(Date.UTC(year, month - 1, day));

  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    throw new Error("INVALID_DATE");
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export async function teacherRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/me/dashboard",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource("student.read", async () => true),
      ],
    },
    async (request, reply) => {
      if (request.user.role !== "TEACHER") {
        return reply.code(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Teacher access required.",
          },
        });
      }

      const query = request.query as { date?: string };
      const date = query.date ?? new Date().toISOString().slice(0, 10);

      let dateRange: { start: Date; end: Date };
      try {
        dateRange = getDateRange(date);
      } catch {
        return reply.code(400).send({
          error: {
            code: "INVALID_DATE",
            message: "date doit respecter le format YYYY-MM-DD.",
          },
        });
      }

      const teacherClasses =
        await app.prisma.teacherClass.findMany({
          where: {
            teacherId: request.user.sub,
          },
          orderBy: {
            class: {
              name: "asc",
            },
          },
          select: {
            class: {
              select: {
                id: true,
                name: true,
                level: true,
                academicYearId: true,
              },
            },
          },
        });

      const classIds = teacherClasses.map(
        ({ class: schoolClass }) => schoolClass.id,
      );

      const dayMap: Record<number, ScheduleDay> = {
        0: "SUNDAY",
        1: "MONDAY",
        2: "TUESDAY",
        3: "WEDNESDAY",
        4: "THURSDAY",
        5: "FRIDAY",
        6: "SATURDAY",
      };

      const dayOfWeek = dayMap[dateRange.start.getUTCDay()];

      const [schedules, pendingAssignments, enrollments] =
        await Promise.all([
          app.prisma.schedule.findMany({
            where: {
              teacherId: request.user.sub,
              classId: {
                in: classIds,
              },
              dayOfWeek,
            },
            orderBy: [
              { startTime: "asc" },
              { endTime: "asc" },
            ],
            select: {
              id: true,
              classId: true,
              subject: true,
              startTime: true,
              endTime: true,
              room: true,
            },
          }),
          app.prisma.assignment.count({
            where: {
              classId: {
                in: classIds,
              },
              status: {
                in: [
                  AssignmentStatus.PENDING,
                  AssignmentStatus.LATE,
                ],
              },
            },
          }),
          app.prisma.studentEnrollment.findMany({
            where: {
              classId: {
                in: classIds,
              },
              status: "ACTIVE",
            },
            select: {
              id: true,
            },
          }),
        ]);

      const enrollmentIds = enrollments.map(
        (enrollment) => enrollment.id,
      );

      const recordedAttendance = enrollmentIds.length
        ? await app.prisma.attendance.count({
            where: {
              enrollmentId: {
                in: enrollmentIds,
              },
              date: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            },
          })
        : 0;

      return reply.code(200).send({
        date,
        teacher: {
          id: request.user.sub,
          firstName: request.user.firstName,
          lastName: request.user.lastName,
        },
        classes: teacherClasses.map(({ class: schoolClass }) => ({
          id: schoolClass.id,
          name: schoolClass.name,
          level: schoolClass.level,
          academicYearId: schoolClass.academicYearId,
        })),
        today: {
          dayOfWeek,
          schedules,
          scheduleCount: schedules.length,
        },
        assignments: {
          pendingCount: pendingAssignments,
        },
        attendance: {
          studentsToRecordCount: Math.max(
            enrollmentIds.length - recordedAttendance,
            0,
          ),
          recordedCount: recordedAttendance,
          totalStudents: enrollmentIds.length,
        },
      });
    },
  );
}
