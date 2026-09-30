import type { FastifyInstance } from "fastify";
import { AssignmentStatus, ScheduleDay } from "@prisma/client";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeResource } from "../middleware/authorize-resource.js";
import { authorize } from "../middleware/authorize.js";

function getScheduleDayFromDate(date: Date): ScheduleDay {
  const map: Record<number, ScheduleDay> = {
    0: "SUNDAY", 1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY",
    4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
  };
  return map[date.getUTCDay()]!;
}

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
    "/",
    {
      onRequest: [authenticate],
      preHandler: [authorize("student.read")],
    },
    async (request, reply) => {
      if (
        request.user.role !== "SCHOOL_ADMIN" &&
        request.user.role !== "SUPER_ADMIN"
      ) {
        return reply.code(403).send({
          error: {
            code: "FORBIDDEN",
            message: "School administrator access required.",
          },
        });
      }

      const schoolId = request.user.schoolId;

      if (!schoolId) {
        return reply.code(400).send({
          error: {
            code: "SCHOOL_REQUIRED",
            message: "A school is required.",
          },
        });
      }

      const academicYear = await app.prisma.academicYear.findFirst({
        where: {
          schoolId,
          status: "ACTIVE",
        },
        orderBy: { startDate: "desc" },
        select: { id: true, name: true },
      });

      if (!academicYear) {
        return reply.code(404).send({
          error: {
            code: "ACTIVE_ACADEMIC_YEAR_NOT_FOUND",
            message: "No active academic year was found.",
          },
        });
      }

      const teachers = await app.prisma.user.findMany({
        where: {
          schoolId,
          role: "TEACHER",
          status: "ACTIVE",
          teacherClassAssignments: {
            some: {
              class: {
                schoolId,
                academicYearId: academicYear.id,
              },
            },
          },
        },
        orderBy: [
          { lastName: "asc" },
          { firstName: "asc" },
        ],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          teacherClassAssignments: {
            where: {
              class: {
                schoolId,
                academicYearId: academicYear.id,
              },
            },
            orderBy: { class: { name: "asc" } },
            select: {
              id: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  level: true,
                },
              },
            },
          },
        },
      });

      return reply.send({
        academicYear,
        teachers: teachers.map((teacher) => ({
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.email,
          status: teacher.status,
          classes: teacher.teacherClassAssignments.map((assignment) => ({
            id: assignment.class.id,
            name: assignment.class.name,
            level: assignment.class.level,
          })),
        })),
      });
    },
  );


  app.get(
    "/me/classes",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource("student.read", async () => true),
      ],
    },
    async (request, reply) => {
      if (request.user.role !== "TEACHER") {
        return reply.code(403).send({
          error: { code: "FORBIDDEN", message: "Teacher access required." },
        });
      }

      const classes = await app.prisma.teacherClass.findMany({
        where: { teacherId: request.user.sub },
        orderBy: { class: { name: "asc" } },
        select: {
          class: {
            select: {
              id: true,
              name: true,
              level: true,
              academicYearId: true,
              academicYear: {
                select: { id: true, name: true, status: true },
              },
              _count: {
                select: {
                  enrollments: {
                    where: { status: "ACTIVE" },
                  },
                },
              },
            },
          },
        },
      });

      return reply.send({
        classes: classes.map(({ class: schoolClass }) => ({
          id: schoolClass.id,
          name: schoolClass.name,
          level: schoolClass.level,
          academicYearId: schoolClass.academicYearId,
          academicYear: schoolClass.academicYear,
          studentCount: schoolClass._count.enrollments,
        })),
      });
    },
  );

  app.get(
    "/me/classes/:classId",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource("student.read", async () => true),
      ],
    },
    async (request, reply) => {
      if (request.user.role !== "TEACHER") {
        return reply.code(403).send({
          error: { code: "FORBIDDEN", message: "Teacher access required." },
        });
      }

      const { classId } = request.params as { classId: string };

      const teacherClass = await app.prisma.teacherClass.findUnique({
        where: {
          teacherId_classId: {
            teacherId: request.user.sub,
            classId,
          },
        },
        select: {
          class: {
            select: {
              id: true,
              name: true,
              level: true,
              academicYearId: true,
              academicYear: {
                select: { id: true, name: true, status: true },
              },
            },
          },
        },
      });

      if (!teacherClass) {
        return reply.code(403).send({
          error: {
            code: "CLASS_ACCESS_DENIED",
            message: "Vous n'êtes pas assigné à cette classe.",
          },
        });
      }

      const enrollments = await app.prisma.studentEnrollment.findMany({
        where: {
          classId,
          status: "ACTIVE",
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
        select: {
          id: true,
          studentId: true,
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
        },
      });

      return reply.send({
        class: teacherClass.class,
        students: enrollments,
      });
    },
  );

  app.get(
    "/me/classes/:classId/attendance",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource("attendance.read", async () => true),
      ],
    },
    async (request, reply) => {
      if (request.user.role !== "TEACHER") {
        return reply.code(403).send({
          error: { code: "FORBIDDEN", message: "Teacher access required." },
        });
      }

      const { classId } = request.params as { classId: string };
      const query = request.query as { date?: string; scheduleId?: string };
      const date = query.date ?? new Date().toISOString().slice(0, 10);
      const scheduleId = query.scheduleId;
      const start = new Date(date + "T00:00:00.000Z");
      const end = new Date(date + "T00:00:00.000Z");
      end.setUTCDate(end.getUTCDate() + 1);

      if (Number.isNaN(start.getTime())) {
        return reply.code(400).send({
          error: { code: "INVALID_DATE", message: "Date invalide." },
        });
      }

      if (!scheduleId) {
        return reply.code(400).send({
          error: { code: "SCHEDULE_REQUIRED", message: "scheduleId est obligatoire pour le pointage du teacher." },
        });
      }

      const schedule = await app.prisma.schedule.findFirst({
        where: { id: scheduleId, teacherId: request.user.sub, classId, dayOfWeek: getScheduleDayFromDate(start) },
        select: { id: true, classId: true },
      });

      if (!schedule) {
        return reply.code(403).send({
          error: { code: "SCHEDULE_ACCESS_DENIED", message: "Vous n'êtes pas responsable de ce créneau." },
        });
      }

      const schedule = await app.prisma.schedule.findFirst({
        where: { id: body.scheduleId, teacherId: request.user.sub, classId, dayOfWeek: getScheduleDayFromDate(date) },
        select: { id: true, classId: true },
      });

      if (!schedule) {
        return reply.code(403).send({
          error: { code: "SCHEDULE_ACCESS_DENIED", message: "Vous n'êtes pas responsable de ce créneau." },
        });
      }

      const teacherClass = await app.prisma.teacherClass.findUnique({
        where: {
          teacherId_classId: {
            teacherId: request.user.sub,
            classId,
          },
        },
        select: { classId: true },
      });

      if (!teacherClass) {
        return reply.code(403).send({
          error: {
            code: "CLASS_ACCESS_DENIED",
            message: "Vous n'êtes pas assigné à cette classe.",
          },
        });
      }

      const enrollments = await app.prisma.studentEnrollment.findMany({
        where: { classId, status: "ACTIVE" },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
        select: {
          id: true,
          studentId: true,
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          attendances: {
            where: { date: { gte: start, lt: end }, scheduleId },
            take: 1,
            select: {
              id: true,
              date: true,
              status: true,
              arrivalTime: true,
              reason: true,
              note: true,
              recordedBy: true,
              events: {
                orderBy: { createdAt: "desc" },
                select: {
                  id: true,
                  type: true,
                  note: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      return reply.send({
        date,
        classId,
        scheduleId,
        students: enrollments.map((enrollment) => ({
          enrollmentId: enrollment.id,
          student: enrollment.student,
          attendance: enrollment.attendances[0] ?? null,
        })),
      });
    },
  );

  app.post(
    "/me/classes/:classId/attendance",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource("attendance.create", async () => true),
      ],
    },
    async (request, reply) => {
      if (request.user.role !== "TEACHER") {
        return reply.code(403).send({
          error: { code: "FORBIDDEN", message: "Teacher access required." },
        });
      }

      const { classId } = request.params as { classId: string };
      const body = request.body as {
        enrollmentId?: string;
        scheduleId?: string;
        date?: string;
        status?: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
        arrivalTime?: string | null;
        reason?: string | null;
        note?: string | null;
      };

      if (!body.enrollmentId || !body.scheduleId || !body.date || !body.status) {
        return reply.code(400).send({
          error: {
            code: "INVALID_ATTENDANCE_DATA",
            message: "enrollmentId, scheduleId, date et status sont obligatoires.",
          },
        });
      }

      const validStatuses = [
        "PRESENT",
        "ABSENT",
        "LATE",
        "EXCUSED",
      ] as const;

      if (!validStatuses.includes(body.status)) {
        return reply.code(400).send({
          error: {
            code: "INVALID_ATTENDANCE_STATUS",
            message: "Le statut de présence est invalide.",
          },
        });
      }

      const date = new Date(body.date + "T00:00:00.000Z");
      if (Number.isNaN(date.getTime())) {
        return reply.code(400).send({
          error: { code: "INVALID_DATE", message: "Date invalide." },
        });
      }

      const teacherClass = await app.prisma.teacherClass.findUnique({
        where: {
          teacherId_classId: {
            teacherId: request.user.sub,
            classId,
          },
        },
        select: { classId: true },
      });

      if (!teacherClass) {
        return reply.code(403).send({
          error: {
            code: "CLASS_ACCESS_DENIED",
            message: "Vous n'êtes pas assigné à cette classe.",
          },
        });
      }

      const enrollment = await app.prisma.studentEnrollment.findFirst({
        where: {
          id: body.enrollmentId,
          classId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          studentId: true,
        },
      });

      if (!enrollment) {
        return reply.code(404).send({
          error: {
            code: "ENROLLMENT_NOT_FOUND",
            message: "Inscription élève introuvable.",
          },
        });
      }

      if (body.status === "LATE") {
        return reply.code(403).send({
          error: {
            code: "TEACHER_LATE_FORBIDDEN",
            message: "Le teacher peut uniquement enregistrer Présent ou Absent. Le retard est géré par le surveillant.",
          },
        });
      }

      const sessionKey = body.scheduleId + ":" + body.date + ":" + enrollment.studentId;

      const attendance = await app.prisma.attendance.upsert({
        where: { sessionKey },
        create: {
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          scheduleId: body.scheduleId,
          sessionKey,
          date,
          status: body.status,
          arrivalTime: null,
          reason: null,
          note: body.note ?? null,
          recordedBy: request.user.sub,
        },
        update: {
          status: body.status,
          arrivalTime: null,
          reason: null,
          note: body.note ?? null,
          recordedBy: request.user.sub,
          date,
          scheduleId: body.scheduleId,
        },
      });

      return reply.code(200).send({ attendance });
    },
  );

  app.get(
    "/me/observations",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource("observation.read", async () => true),
      ],
    },
    async (request, reply) => {
      if (request.user.role !== "TEACHER") {
        return reply.code(403).send({
          error: { code: "FORBIDDEN", message: "Teacher access required." },
        });
      }

      const query = request.query as { date?: string };
      let dateFilter: { gte: Date; lt: Date } | undefined;

      if (query.date) {
        try {
          const range = getDateRange(query.date);
          dateFilter = { gte: range.start, lt: range.end };
        } catch {
          return reply.code(400).send({
            error: {
              code: "INVALID_DATE",
              message: "date doit respecter le format YYYY-MM-DD.",
            },
          });
        }
      }

      const observations = await app.prisma.lessonObservation.findMany({
        where: {
          teacherId: request.user.sub,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        orderBy: [
          { date: "desc" },
          { schedule: { startTime: "asc" } },
        ],
        select: {
          id: true,
          scheduleId: true,
          date: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          schedule: {
            select: {
              subject: true,
              startTime: true,
              endTime: true,
              room: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  level: true,
                },
              },
            },
          },
        },
      });

      return reply.send({ observations });
    },
  );

  app.post(
    "/me/observations",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource("observation.create", async () => true),
      ],
    },
    async (request, reply) => {
      if (request.user.role !== "TEACHER") {
        return reply.code(403).send({
          error: { code: "FORBIDDEN", message: "Teacher access required." },
        });
      }

      const body = request.body as {
        scheduleId?: string;
        date?: string;
        content?: string;
      };

      const content = body.content?.trim();

      if (!body.scheduleId || !body.date || !content) {
        return reply.code(400).send({
          error: {
            code: "INVALID_OBSERVATION_DATA",
            message: "scheduleId, date et content sont obligatoires.",
          },
        });
      }

      let date: Date;
      try {
        date = getDateRange(body.date).start;
      } catch {
        return reply.code(400).send({
          error: {
            code: "INVALID_DATE",
            message: "date doit respecter le format YYYY-MM-DD.",
          },
        });
      }

      const schedule = await app.prisma.schedule.findFirst({
        where: {
          id: body.scheduleId,
          teacherId: request.user.sub,
        },
        select: { id: true },
      });

      if (!schedule) {
        return reply.code(403).send({
          error: {
            code: "SCHEDULE_ACCESS_DENIED",
            message: "Vous n'êtes pas responsable de ce créneau.",
          },
        });
      }

      const observation = await app.prisma.lessonObservation.upsert({
        where: {
          scheduleId_date: {
            scheduleId: schedule.id,
            date,
          },
        },
        update: {
          content,
        },
        create: {
          teacherId: request.user.sub,
          scheduleId: schedule.id,
          date,
          content,
        },
        select: {
          id: true,
          scheduleId: true,
          date: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.code(200).send({ observation });
    },
  );

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

      const teacher = await app.prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!teacher) {
        return reply.code(404).send({
          error: {
            code: "TEACHER_NOT_FOUND",
            message: "Teacher not found.",
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

      const dayOfWeek = dayMap[dateRange.start.getUTCDay()]!;

      const [schedules, pendingAssignments, enrollments, observationsCount] =
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
          app.prisma.lessonObservation.count({
            where: {
              teacherId: request.user.sub,
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
        teacher,
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
        observations: {
          count: observationsCount,
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
