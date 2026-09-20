import type { FastifyInstance } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

export async function schoolAdminDashboardRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/dashboard",
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
            message:
              "A school is required for the school administrator dashboard.",
          },
        });
      }

      const school = await app.prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      });

      if (!school) {
        return reply.code(404).send({
          error: {
            code: "SCHOOL_NOT_FOUND",
            message: "School not found.",
          },
        });
      }

      const academicYear = await app.prisma.academicYear.findFirst({
        where: {
          schoolId,
          status: "ACTIVE",
        },
        orderBy: {
          startDate: "desc",
        },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      });

      if (!academicYear) {
        return reply.code(404).send({
          error: {
            code: "ACTIVE_ACADEMIC_YEAR_NOT_FOUND",
            message: "No active academic year was found for this school.",
          },
        });
      }

      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);

      const endOfToday = new Date(startOfToday);
      endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

      const [
        studentCount,
        teacherCount,
        classes,
        staffAssignments,
        attendance,
        announcementCount,
        unreadMessages,
      ] = await Promise.all([
        app.prisma.studentEnrollment.count({
          where: {
            academicYearId: academicYear.id,
            status: "ACTIVE",
            student: {
              schoolId,
              status: "ACTIVE",
            },
          },
        }),
        app.prisma.user.count({
          where: {
            schoolId,
            role: "TEACHER",
            status: "ACTIVE",
          },
        }),
        app.prisma.schoolClass.findMany({
          where: {
            schoolId,
            academicYearId: academicYear.id,
          },
          orderBy: [
            { level: "asc" },
            { name: "asc" },
          ],
          select: {
            id: true,
            name: true,
            level: true,
            _count: {
              select: {
                enrollments: {
                  where: {
                    status: "ACTIVE",
                  },
                },
              },
            },
          },
        }),
        app.prisma.staffAssignment.findMany({
          where: {
            schoolId,
            active: true,
            staff: {
              user: {
                status: "ACTIVE",
              },
            },
          },
          orderBy: {
            startDate: "asc",
          },
          select: {
            id: true,
            staff: {
              select: {
                function: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    status: true,
                  },
                },
              },
            },
          },
        }),
        app.prisma.attendance.groupBy({
          by: ["status"],
          where: {
            date: {
              gte: startOfToday,
              lt: endOfToday,
            },
            enrollment: {
              academicYearId: academicYear.id,
              status: "ACTIVE",
            },
            student: {
              schoolId,
            },
          },
          _count: {
            _all: true,
          },
        }),
        app.prisma.announcement.count({
          where: {
            schoolId,
            academicYearId: academicYear.id,
            deletedAt: null,
          },
        }),
        app.prisma.message.count({
          where: {
            conversation: {
              schoolId,
              participants: {
                some: {
                  userId: request.user.sub,
                },
              },
            },
            senderId: {
              not: request.user.sub,
            },
            readAt: null,
          },
        }),
      ]);

      const attendanceSummary = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        recorded: 0,
      };

      for (const entry of attendance) {
        const count = entry._count._all;
        attendanceSummary.recorded += count;

        if (entry.status === "PRESENT") {
          attendanceSummary.present = count;
        } else if (entry.status === "ABSENT") {
          attendanceSummary.absent = count;
        } else if (entry.status === "LATE") {
          attendanceSummary.late = count;
        } else if (entry.status === "EXCUSED") {
          attendanceSummary.excused = count;
        }
      }

      const personnel = Array.from(
        new Map(
          staffAssignments.map((assignment) => [assignment.staff.user.id, assignment]),
        ).values(),
      );

      return reply.send({
        school,
        academicYear,
        counts: {
          students: studentCount,
          teachers: teacherCount,
          classes: classes.length,
          staff: personnel.length,
        },
        classes: classes.map((schoolClass) => ({
          id: schoolClass.id,
          name: schoolClass.name,
          level: schoolClass.level,
          studentCount: schoolClass._count.enrollments,
        })),
        personnel: personnel.map((assignment) => ({
          id: assignment.staff.user.id,
          assignmentId: assignment.id,
          firstName: assignment.staff.user.firstName,
          lastName: assignment.staff.user.lastName,
          email: assignment.staff.user.email,
          function: assignment.staff.function,
          status: assignment.staff.user.status,
        })),
        attendance: attendanceSummary,
        communication: {
          announcements: announcementCount,
          unreadMessages,
        },
      });
    },
  );
}
