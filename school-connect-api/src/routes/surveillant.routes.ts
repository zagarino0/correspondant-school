import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ScheduleDay } from "@prisma/client";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { authorizeStudentResource } from "../middleware/authorize-student-resource.js";
import { publishToUser } from "../realtime/message-events.js";

const eventTypeSchema = z.enum([
  "LATE_AUTHORIZED",
  "LATE_NOT_AUTHORIZED",
  "ABSENCE_JUSTIFIED",
  "ABSENCE_UNJUSTIFIED",
]);

const DAY_MAP = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function dayOfWeek(date: Date): ScheduleDay {
  return DAY_MAP[date.getDay()] ?? "SUNDAY";
}

function todayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function surveillantRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/dashboard",
    {
      onRequest: [authenticate],
      preHandler: [authorize("attendance-event.read")],
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({
          error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." },
        });
      }

      const { start, end } = todayRange();
      const day = dayOfWeek(start);

      const [studentCount, attendance, schedules, lateEvents] =
        await Promise.all([
          fastify.prisma.student.count({
            where: { schoolId, status: "ACTIVE" },
          }),
          fastify.prisma.attendance.findMany({
            where: {
              date: { gte: start, lt: end },
              student: { schoolId },
            },
            select: {
              id: true,
              studentId: true,
              status: true,
              arrivalTime: true,
              reason: true,
              note: true,
              student: {
                select: { id: true, firstName: true, lastName: true },
              },
              events: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { id: true, type: true, note: true, createdAt: true },
              },
            },
          }),
          fastify.prisma.schedule.findMany({
            where: { schoolId, dayOfWeek: day },
            orderBy: [{ startTime: "asc" }],
            select: {
              id: true,
              classId: true,
              teacherId: true,
              subject: true,
              startTime: true,
              endTime: true,
              room: true,
            },
          }),
          fastify.prisma.attendance.findMany({
            where: {
              date: { gte: start, lt: end },
              status: "LATE",
              student: { schoolId },
            },
            orderBy: { arrivalTime: "asc" },
            take: 50,
            select: {
              id: true,
              studentId: true,
              arrivalTime: true,
              student: { select: { id: true, firstName: true, lastName: true } },
              events: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { id: true, type: true, note: true, createdAt: true },
              },
            },
          }),
        ]);

      const [classes, teachers] = await Promise.all([
        fastify.prisma.schoolClass.findMany({
          where: { id: { in: schedules.map((schedule) => schedule.classId) } },
          select: {
            id: true,
            name: true,
            enrollments: {
              where: { status: "ACTIVE" },
              select: { id: true, studentId: true },
            },
          },
        }),
        fastify.prisma.user.findMany({
          where: { id: { in: schedules.map((schedule) => schedule.teacherId) } },
          select: { id: true, firstName: true, lastName: true },
        }),
      ]);

      const classById = new Map(classes.map((item) => [item.id, item]));
      const teacherById = new Map(teachers.map((item) => [item.id, item]));

      const counts = attendance.reduce(
        (acc, item) => {
          acc[item.status] = (acc[item.status] ?? 0) + 1;
          return acc;
        },
        { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } as Record<string, number>,
      );

      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      const currentSession =
        schedules.find((item) => {
          const [sh = 0, sm = 0] = item.startTime.split(":").map(Number);
          const [eh = 0, em = 0] = item.endTime.split(":").map(Number);
          return sh * 60 + sm <= nowMinutes && nowMinutes < eh * 60 + em;
        }) ?? null;

      const sessions = schedules.map((schedule) => {
        const schoolClass = classById.get(schedule.classId);
        const teacher = teacherById.get(schedule.teacherId) ?? null;
        const classStudentIds = new Set(
          schoolClass?.enrollments.map((enrollment) => enrollment.studentId) ?? [],
        );
        const classAttendance = attendance.filter((item) =>
          classStudentIds.has(item.studentId),
        );

        return {
          scheduleId: schedule.id,
          classId: schedule.classId,
          className: schoolClass?.name ?? "Classe inconnue",
          subject: schedule.subject,
          teacher,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          room: schedule.room,
          attendance: {
            totalStudents: schoolClass?.enrollments.length ?? 0,
            present: classAttendance.filter((item) => item.status === "PRESENT").length,
            absent: classAttendance.filter((item) => item.status === "ABSENT").length,
            late: classAttendance.filter((item) => item.status === "LATE").length,
            recorded: classAttendance.length > 0,
          },
        };
      });

      return reply.send({
        school: { id: schoolId },
        summary: {
          totalStudents: studentCount,
          presentToday: counts.PRESENT,
          absentToday: counts.ABSENT,
          lateToday: counts.LATE,
        },
        currentSession: currentSession
          ? sessions.find((item) => item.scheduleId === currentSession.id) ?? null
          : null,
        attendanceToControl: sessions.filter((item) => item.attendance.recorded),
        lateArrivals: lateEvents.map((item) => ({
          id: item.id,
          attendanceId: item.id,
          type: item.events[0]?.type ?? null,
          note: item.events[0]?.note ?? null,
          createdAt: item.events[0]?.createdAt ?? item.arrivalTime ?? start,
          student: item.student,
          attendance: { arrivalTime: item.arrivalTime },
        })),
        absenceItems: attendance
          .filter((item) => item.status === "ABSENT")
          .map((item) => ({
            id: item.id,
            attendanceId: item.id,
            student: item.student,
            reason: item.reason,
            note: item.note,
            latestEvent: item.events[0] ?? null,
          })),
        upcomingSessions: sessions,
      });
    },
  );

  fastify.get(
    "/today",
    {
      onRequest: [authenticate],
      preHandler: [authorize("attendance-event.read")],
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const { start } = todayRange();
      const schedules = await fastify.prisma.schedule.findMany({
        where: { schoolId, dayOfWeek: dayOfWeek(start) },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          classId: true,
          teacherId: true,
          subject: true,
          startTime: true,
          endTime: true,
          room: true,
        },
      });

      const [classes, teachers] = await Promise.all([
        fastify.prisma.schoolClass.findMany({
          where: { id: { in: schedules.map((schedule) => schedule.classId) } },
          select: { id: true, name: true, enrollments: { where: { status: "ACTIVE" }, select: { studentId: true } } },
        }),
        fastify.prisma.user.findMany({
          where: { id: { in: schedules.map((schedule) => schedule.teacherId) } },
          select: { id: true, firstName: true, lastName: true },
        }),
      ]);
      const classById = new Map(classes.map((item) => [item.id, item]));
      const teacherById = new Map(teachers.map((item) => [item.id, item]));

      return reply.send({
        date: start.toISOString().slice(0, 10),
        sessions: schedules.map((schedule) => ({
          ...schedule,
          class: classById.get(schedule.classId) ?? null,
          teacher: teacherById.get(schedule.teacherId) ?? null,
        })),
      });
    },
  );

  fastify.get(
    "/attendance",
    {
      onRequest: [authenticate],
      preHandler: [authorize("attendance-event.read")],
    },
    async (request, reply) => {
      const query = request.query as { date?: string; classId?: string };
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const date = query.date ? new Date(query.date) : new Date();
      if (Number.isNaN(date.getTime())) return reply.status(400).send({ error: { code: "INVALID_DATE", message: "The date is invalid." } });
      const { start, end } = todayRange(date);

      const attendances = await fastify.prisma.attendance.findMany({
        where: {
          date: { gte: start, lt: end },
          student: {
            schoolId,
            ...(query.classId ? { enrollments: { some: { classId: query.classId, status: "ACTIVE" } } } : {}),
          },
        },
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
        select: {
          id: true,
          studentId: true,
          status: true,
          arrivalTime: true,
          reason: true,
          note: true,
          student: { select: { id: true, firstName: true, lastName: true } },
          events: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, type: true, note: true, createdAt: true },
          },
        },
      });

      return reply.send({ date: start.toISOString().slice(0, 10), attendance: attendances });
    },
  );

  fastify.get(
    "/late",
    {
      onRequest: [authenticate],
      preHandler: [authorize("attendance-event.read")],
    },
    async (request, reply) => {
      const query = request.query as { date?: string; classId?: string };
      const schoolId = request.user.schoolId;
      if (!schoolId) return reply.status(403).send({ error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." } });

      const date = query.date ? new Date(query.date) : new Date();
      const { start, end } = todayRange(date);

      const items = await fastify.prisma.attendance.findMany({
        where: {
          date: { gte: start, lt: end },
          status: "LATE",
          student: {
            schoolId,
            ...(query.classId ? { enrollments: { some: { classId: query.classId, status: "ACTIVE" } } } : {}),
          },
        },
        orderBy: { arrivalTime: "asc" },
        select: {
          id: true,
          studentId: true,
          arrivalTime: true,
          reason: true,
          note: true,
          student: { select: { id: true, firstName: true, lastName: true } },
          events: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, type: true, note: true, createdAt: true },
          },
        },
      });

      return reply.send({ date: start.toISOString().slice(0, 10), items });
    },
  );

  fastify.post(
    "/events/:studentId",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("attendance-event.create")],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const parsed = z.object({
        attendanceId: z.string().min(1),
        type: eventTypeSchema,
        note: z.string().trim().max(500).nullable().optional(),
      }).safeParse(request.body);

      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid attendance event." } });

      const attendance = await fastify.prisma.attendance.findFirst({
        where: { id: parsed.data.attendanceId, studentId },
        include: {
          student: {
            include: {
              parents: { select: { parentId: true } },
              enrollments: {
                where: { status: "ACTIVE" },
                select: { classId: true },
              },
            },
          },
        },
      });

      if (!attendance) return reply.status(404).send({ error: { code: "ATTENDANCE_NOT_FOUND", message: "Attendance not found." } });

      if (parsed.data.type.startsWith("LATE_") && attendance.status !== "LATE") {
        return reply.status(400).send({ error: { code: "INVALID_EVENT_STATUS", message: "A late event requires a LATE attendance." } });
      }

      if (parsed.data.type.startsWith("ABSENCE_") && attendance.status !== "ABSENT") {
        return reply.status(400).send({ error: { code: "INVALID_EVENT_STATUS", message: "An absence event requires an ABSENT attendance." } });
      }

      const event = await fastify.prisma.attendanceEvent.create({
        data: {
          attendanceId: attendance.id,
          studentId,
          createdBy: request.user.sub,
          type: parsed.data.type,
          note: parsed.data.note ?? null,
        },
        select: {
          id: true,
          attendanceId: true,
          studentId: true,
          type: true,
          note: true,
          createdBy: true,
          createdAt: true,
        },
      });

      const teacherIds = await fastify.prisma.teacherClass.findMany({
        where: { classId: { in: attendance.student.enrollments.map((item) => item.classId) } },
        select: { teacherId: true },
      });

      const parentIds = attendance.student.parents.map((parent) => parent.parentId);
      const payload = {
        event,
        attendance: {
          id: attendance.id,
          studentId: attendance.studentId,
          status: attendance.status,
          arrivalTime: attendance.arrivalTime,
          reason: attendance.reason,
          note: attendance.note,
        },
      };

      for (const recipientId of new Set([
        ...teacherIds.map((item) => item.teacherId),
        ...parentIds,
        attendance.student.userId,
      ])) {
        publishToUser(recipientId, "attendance:event", payload);
      }

      return reply.status(201).send({ event });
    },
  );

  fastify.post(
    "/summons/:studentId",
    {
      onRequest: [authenticate],
      preHandler: [authorizeStudentResource("parent-summons.create")],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const parsed = z.object({
        reason: z.string().trim().min(1).max(200),
        message: z.string().trim().min(1).max(2000),
        scheduledAt: z.string().datetime().nullable().optional(),
        parentId: z.string().min(1).optional(),
      }).safeParse(request.body);

      if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid parent summons." } });

      const student = await fastify.prisma.student.findUnique({
        where: { id: studentId },
        include: {
          parents: { select: { parentId: true } },
        },
      });

      if (!student) return reply.status(404).send({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found." } });

      const parentIds = parsed.data.parentId
        ? student.parents.map((p) => p.parentId).filter((id) => id === parsed.data.parentId)
        : student.parents.map((p) => p.parentId);

      if (parentIds.length === 0) return reply.status(400).send({ error: { code: "NO_PARENT_LINKED", message: "No parent is linked to this student." } });

      const summons = await fastify.prisma.$transaction(
        parentIds.map((parentId) =>
          fastify.prisma.parentSummons.create({
            data: {
              studentId,
              parentId,
              createdBy: request.user.sub,
              reason: parsed.data.reason,
              message: parsed.data.message,
              scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
            },
            select: {
              id: true,
              studentId: true,
              parentId: true,
              reason: true,
              message: true,
              status: true,
              scheduledAt: true,
              createdAt: true,
            },
          }),
        ),
      );

      const teacherIds = await fastify.prisma.teacherClass.findMany({
        where: {
          classId: {
            in: (
              await fastify.prisma.studentEnrollment.findMany({
                where: { studentId, status: "ACTIVE" },
                select: { classId: true },
              })
            ).map((item) => item.classId),
          },
        },
        select: { teacherId: true },
      });

      for (const summon of summons) {
        publishToUser(summon.parentId, "parent:summons:new", summon);
      }
      for (const teacher of teacherIds) {
        publishToUser(teacher.teacherId, "parent:summons:new", {
          studentId,
          reason: parsed.data.reason,
          message: parsed.data.message,
          createdAt: new Date(),
        });
      }

      return reply.status(201).send({ summons });
    },
  );
}
