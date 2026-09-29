import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ScheduleDay } from "@prisma/client";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { authorizeStudentResource } from "../middleware/authorize-student-resource.js";
import { publishToUser } from "../realtime/message-events.js";
import { buildSummonsSmsMessage, enqueueSmsNotification } from "../services/sms.service.js";

const eventTypeSchema = z.enum([
  "LATE_AUTHORIZED",
  "LATE_NOT_AUTHORIZED",
  "ABSENCE_JUSTIFIED",
  "ABSENCE_UNJUSTIFIED",
]);

const summonsReasonSchema = z.enum([
  "Retards répétés",
  "Retard non autorisé",
  "Absences répétées",
  "Absence non justifiée",
  "Problème de ponctualité",
  "Suivi disciplinaire",
  "Autre",
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
    "/notifications/summons",
    {
      onRequest: [authenticate],
      preHandler: [authorize("parent-summons.read")],
    },
    async (request, reply) => {
      const items = await fastify.prisma.parentSummons.findMany({
        where: {
          createdBy: request.user.sub,
          status: { in: ["ACCEPTED", "DECLINED"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          studentId: true,
          reason: true,
          message: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          responseReadAt: true,
          student: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      const unreadCount = items.filter((item) => item.responseReadAt === null).length;
      return reply.send({ items, unreadCount });
    },
  );

  fastify.patch(
    "/notifications/summons/:summonsId/read",
    {
      onRequest: [authenticate],
      preHandler: [authorize("parent-summons.read")],
    },
    async (request, reply) => {
      const { summonsId } = request.params as { summonsId: string };
      const result = await fastify.prisma.parentSummons.updateMany({
        where: {
          id: summonsId,
          createdBy: request.user.sub,
          status: { in: ["ACCEPTED", "DECLINED"] },
          responseReadAt: null,
        },
        data: { responseReadAt: new Date() },
      });

      if (result.count === 0) {
        return reply.status(404).send({
          error: { code: "NOTIFICATION_NOT_FOUND", message: "Notification not found." },
        });
      }

      return reply.send({ success: true });
    },
  );

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
    "/classes",
    {
      onRequest: [authenticate],
      preHandler: [authorize("attendance-event.read")],
    },
    async (request, reply) => {
      const query = request.query as {
        search?: string;
        level?: string;
        category?: string;
        limit?: string;
      };
      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.status(403).send({
          error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." },
        });
      }

      const search = query.search?.trim() ?? "";
      const level = query.level?.trim() ?? "";
      const category = query.category?.trim() ?? "";
      const parsedLimit = Number(query.limit ?? 20);
      const limit = Number.isFinite(parsedLimit)
        ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 30)
        : 20;

      const where = {
        schoolId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { level: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(level ? { level: { equals: level, mode: "insensitive" as const } } : {}),
      };

      const categoryLevels: Record<string, string[]> = {
        primaire: ["CP", "CE1", "CE2", "CM1", "CM2"],
        "premier-cycle": ["6e", "5e", "4e", "3e"],
        "deuxieme-cycle": ["2nde", "2nd", "1ère", "1re", "Terminale", "Tle"],
      };

      const normalizedCategory = category.toLowerCase();
      if (normalizedCategory && categoryLevels[normalizedCategory]) {
        where.level = { in: categoryLevels[normalizedCategory] };
      }

      const [classes, total, levels] = await Promise.all([
        fastify.prisma.schoolClass.findMany({
          where,
          orderBy: [{ level: "asc" }, { name: "asc" }],
          take: limit + 1,
          select: {
            id: true,
            name: true,
            level: true,
            _count: {
              select: {
                enrollments: { where: { status: "ACTIVE" } },
              },
            },
          },
        }),
        fastify.prisma.schoolClass.count({ where }),
        fastify.prisma.schoolClass.findMany({
          where: { schoolId },
          distinct: ["level"],
          orderBy: { level: "asc" },
          select: { level: true },
        }),
      ]);

      const hasMore = classes.length > limit;
      const items = classes.slice(0, limit).map((item) => ({
        id: item.id,
        name: item.name,
        level: item.level,
        studentCount: item._count.enrollments,
      }));

      return reply.send({
        items,
        total,
        hasMore,
        levels: levels.map((item) => item.level).filter((value): value is string => Boolean(value)),
        categories: ["primaire", "premier-cycle", "deuxieme-cycle"],
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
              parents: {
        select: {
          parentId: true,
          parent: { select: { phone: true, smsEnabled: true } },
        },
      },
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
        attendanceEventId: z.string().min(1).nullable().optional(),
        reason: summonsReasonSchema,
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

      let attendanceEvent: { id: string; studentId: string; attendanceId: string; type: import("@prisma/client").AttendanceEventType } | null = null;
      if (parsed.data.attendanceEventId) {
        attendanceEvent = await fastify.prisma.attendanceEvent.findFirst({
          where: {
            id: parsed.data.attendanceEventId,
            studentId,
          },
          select: {
            id: true,
            studentId: true,
            attendanceId: true,
            type: true,
          },
        });
        if (!attendanceEvent) {
          return reply.status(404).send({
            error: { code: "ATTENDANCE_EVENT_NOT_FOUND", message: "Attendance event not found for this student." },
          });
        }
      }

      const parentIds = parsed.data.parentId
        ? student.parents.map((p) => p.parentId).filter((id) => id === parsed.data.parentId)
        : student.parents.map((p) => p.parentId);

      if (parentIds.length === 0) return reply.status(400).send({ error: { code: "NO_PARENT_LINKED", message: "No parent is linked to this student." } });

      const summons = await fastify.prisma.$transaction(async (tx) => {
        const createdSummons = [];

        for (const parentId of parentIds) {
          const parentLink = student.parents.find((parent) => parent.parentId === parentId);
          const scheduledAt = parsed.data.scheduledAt
            ? new Date(parsed.data.scheduledAt)
            : null;

          const summon = await tx.parentSummons.create({
            data: {
              studentId,
              parentId,
              createdBy: request.user.sub,
              attendanceEventId: attendanceEvent?.id ?? null,
              reason: parsed.data.reason,
              message: parsed.data.message,
              scheduledAt,
            },
            select: {
              id: true,
              studentId: true,
              parentId: true,
              attendanceEventId: true,
              reason: true,
              message: true,
              status: true,
              scheduledAt: true,
              createdAt: true,
            },
          });

          await enqueueSmsNotification(tx, {
            recipientId: parentId,
            studentId,
            parentSummonsId: summon.id,
            type: "SUMMONS",
            phone: parentLink?.parent.phone ?? null,
            message: buildSummonsSmsMessage({
              studentFirstName: student.firstName,
              studentLastName: student.lastName,
              reason: parsed.data.reason,
              scheduledAt,
            }),
          });

          createdSummons.push(summon);
        }

        return createdSummons;
      });

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
