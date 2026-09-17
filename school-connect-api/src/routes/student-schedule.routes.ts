import type { FastifyInstance } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeResource } from "../middleware/authorize-resource.js";

const scheduleDays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export async function studentScheduleRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/me",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "schedule.read",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const userSchoolId = request.user.schoolId;

      const student = await app.prisma.student.findUnique({
        where: {
          userId,
        },
        select: {
          id: true,
          schoolId: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!student) {
        return reply.code(404).send({
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student profile not found.",
          },
        });
      }

      if (
        userSchoolId &&
        student.schoolId !== userSchoolId
      ) {
        return reply.code(403).send({
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message:
              "You do not have access to this resource.",
          },
        });
      }

      const enrollment =
        await app.prisma.studentEnrollment.findFirst({
          where: {
            studentId: student.id,
            status: "ACTIVE",
            academicYear: {
              status: "ACTIVE",
              schoolId: student.schoolId,
            },
            class: {
              schoolId: student.schoolId,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            academicYearId: true,
            classId: true,
            status: true,
            academicYear: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                level: true,
                schoolId: true,
              },
            },
          },
        });

      if (!enrollment) {
        return reply.code(404).send({
          error: {
            code: "ACTIVE_ENROLLMENT_NOT_FOUND",
            message:
              "No active enrollment was found for this student.",
          },
        });
      }

      const schedules =
        await app.prisma.schedule.findMany({
          where: {
            schoolId: student.schoolId,
            academicYearId:
              enrollment.academicYearId,
            classId: enrollment.classId,
          },
          orderBy: [
            {
              dayOfWeek: "asc",
            },
            {
              startTime: "asc",
            },
            {
              endTime: "asc",
            },
          ],
          select: {
            id: true,
            schoolId: true,
            academicYearId: true,
            classId: true,
            teacherId: true,
            subject: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            room: true,
            createdAt: true,
            updatedAt: true,
          },
        });

      return reply.code(200).send({
        student,
        enrollment,
        schedules,
      });
    },
  );

  app.get(
    "/me/next",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "schedule.read",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const userSchoolId = request.user.schoolId;

      const student = await app.prisma.student.findUnique({
        where: {
          userId,
        },
        select: {
          id: true,
          schoolId: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!student) {
        return reply.code(404).send({
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student profile not found.",
          },
        });
      }

      if (
        userSchoolId &&
        student.schoolId !== userSchoolId
      ) {
        return reply.code(403).send({
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message:
              "You do not have access to this resource.",
          },
        });
      }

      const enrollment =
        await app.prisma.studentEnrollment.findFirst({
          where: {
            studentId: student.id,
            status: "ACTIVE",
            academicYear: {
              status: "ACTIVE",
              schoolId: student.schoolId,
            },
            class: {
              schoolId: student.schoolId,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            academicYearId: true,
            classId: true,
            status: true,
            academicYear: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                level: true,
                schoolId: true,
              },
            },
          },
        });

      if (!enrollment) {
        return reply.code(404).send({
          error: {
            code: "ACTIVE_ENROLLMENT_NOT_FOUND",
            message:
              "No active enrollment was found for this student.",
          },
        });
      }

      const schedules =
        await app.prisma.schedule.findMany({
          where: {
            schoolId: student.schoolId,
            academicYearId:
              enrollment.academicYearId,
            classId: enrollment.classId,
          },
          select: {
            id: true,
            schoolId: true,
            academicYearId: true,
            classId: true,
            teacherId: true,
            subject: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            room: true,
            createdAt: true,
            updatedAt: true,
          },
        });

      const now = new Date();
      const todayIndex = (now.getDay() + 6) % 7;
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`;

      const nextSchedule = schedules
        .map((schedule) => {
          const scheduleDayIndex = scheduleDays.indexOf(
            schedule.dayOfWeek,
          );
          let dayOffset =
            (scheduleDayIndex - todayIndex + 7) % 7;

          if (
            dayOffset === 0 &&
            schedule.startTime < currentTime
          ) {
            dayOffset = 7;
          }

          return {
            schedule,
            dayOffset,
          };
        })
        .sort((a, b) => {
          if (a.dayOffset !== b.dayOffset) {
            return a.dayOffset - b.dayOffset;
          }

          return a.schedule.startTime.localeCompare(
            b.schedule.startTime,
          );
        })[0]?.schedule;

      if (!nextSchedule) {
        return reply.code(404).send({
          error: {
            code: "NEXT_SCHEDULE_NOT_FOUND",
            message: "No upcoming class was found.",
          },
        });
      }

      return reply.code(200).send({
        student,
        enrollment,
        schedule: nextSchedule,
      });
    },
  );
}
