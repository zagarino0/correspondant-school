import type { FastifyInstance } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeResource } from "../middleware/authorize-resource.js";
import { authorizeStudentResource } from "../middleware/authorize-student-resource.js";

export async function attendanceRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/attendance/student/:studentId",
    {
      onRequest: [
        authenticate,
        //authorizeResource("attendance.read"),
        authorizeStudentResource("attendance.read"),
      ],
    },
    async (request, reply) => {
      const { studentId } = request.params as {
        studentId: string;
      };

      const student = await fastify.prisma.student.findUnique({
        where: {
          id: studentId,
        },
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!student) {
        return reply.status(404).send({
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student not found.",
          },
        });
      }

      const attendance = await fastify.prisma.attendance.findMany({
        where: {
          studentId,
        },
        orderBy: {
          date: "desc",
        },
        select: {
          id: true,
          date: true,
          status: true,
          arrivalTime: true,
          reason: true,
          note: true,
          recordedBy: true,
          createdAt: true,
          updatedAt: true,
          events: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              type: true,
              note: true,
              createdAt: true,
            },
          },
          recorder: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return reply.send({
        student,
        attendance,
      });
    }
  );

  fastify.post(
  "/attendance",
  {
    onRequest: [authenticate],
    preHandler: [
      authorizeStudentResource("attendance.create"),
    ],
  },
  async (request, reply) => {
    const body = request.body as {
      studentId?: string;
      enrollmentId?: string;
      date?: string;
      status?: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
      arrivalTime?: string | null;
      reason?: string | null;
      note?: string | null;
    };

    const {
      studentId,
      enrollmentId,
      date,
      status,
      arrivalTime,
      reason,
      note,
    } = body;

    if (!studentId || !enrollmentId || !date || !status) {
      return reply.status(400).send({
        error: {
          code: "INVALID_ATTENDANCE_DATA",
          message:
            "studentId, enrollmentId, date and status are required.",
        },
      });
    }

    const attendanceDate = new Date(date);

    if (Number.isNaN(attendanceDate.getTime())) {
      return reply.status(400).send({
        error: {
          code: "INVALID_ATTENDANCE_DATE",
          message: "The attendance date is invalid.",
        },
      });
    }

    const validStatuses = [
      "PRESENT",
      "ABSENT",
      "LATE",
      "EXCUSED",
    ] as const;

    if (!validStatuses.includes(status)) {
      return reply.status(400).send({
        error: {
          code: "INVALID_ATTENDANCE_STATUS",
          message: "The attendance status is invalid.",
        },
      });
    }

    if (arrivalTime !== undefined && arrivalTime !== null) {
      const parsedArrivalTime = new Date(arrivalTime);

      if (Number.isNaN(parsedArrivalTime.getTime())) {
        return reply.status(400).send({
          error: {
            code: "INVALID_ARRIVAL_TIME",
            message: "The arrival time is invalid.",
          },
        });
      }
    }

    const student = await fastify.prisma.student.findUnique({
      where: {
        id: studentId,
      },
      select: {
        id: true,
        schoolId: true,
      },
    });

    if (!student) {
      return reply.status(404).send({
        error: {
          code: "STUDENT_NOT_FOUND",
          message: "Student not found.",
        },
      });
    }

    const enrollment = await fastify.prisma.studentEnrollment.findUnique({
      where: {
        id: enrollmentId,
      },
      select: {
        id: true,
        studentId: true,
        academicYearId: true,
        classId: true,
        status: true,
        academicYear: {
          select: {
            id: true,
            schoolId: true,
            name: true,
            status: true,
          },
        },
        class: {
          select: {
            id: true,
            schoolId: true,
          },
        },
      },
    });

    if (!enrollment) {
      return reply.status(404).send({
        error: {
          code: "ENROLLMENT_NOT_FOUND",
          message: "Student enrollment not found.",
        },
      });
    }

    if (enrollment.studentId !== student.id) {
      return reply.status(400).send({
        error: {
          code: "ENROLLMENT_STUDENT_MISMATCH",
          message:
            "The enrollment does not belong to the specified student.",
        },
      });
    }

    if (enrollment.academicYear.schoolId !== student.schoolId) {
      return reply.status(400).send({
        error: {
          code: "ENROLLMENT_SCHOOL_MISMATCH",
          message:
            "The enrollment does not belong to the student's school.",
        },
      });
    }

    if (enrollment.class.schoolId !== student.schoolId) {
      return reply.status(400).send({
        error: {
          code: "CLASS_SCHOOL_MISMATCH",
          message:
            "The class does not belong to the student's school.",
        },
      });
    }

    if (enrollment.status !== "ACTIVE") {
      return reply.status(400).send({
        error: {
          code: "ENROLLMENT_NOT_ACTIVE",
          message: "The student enrollment is not active.",
        },
      });
    }

    const createdAttendance =
      await fastify.prisma.attendance.create({
        data: {
          studentId: student.id,
          enrollmentId: enrollment.id,
          date: attendanceDate,
          status,
          arrivalTime:
            arrivalTime !== undefined && arrivalTime !== null
              ? new Date(arrivalTime)
              : null,
          reason: reason ?? null,
          note: note ?? null,
          recordedBy: request.user.sub,
        },
        select: {
          id: true,
          studentId: true,
          enrollmentId: true,
          date: true,
          status: true,
          arrivalTime: true,
          reason: true,
          note: true,
          recordedBy: true,
          createdAt: true,
          updatedAt: true,
          recorder: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

    return reply.status(201).send({
      attendance: createdAttendance,
    });
  }
);
}