import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { authorizeStudentResource } from "../middleware/authorize-student-resource.js";

const studentCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  studentNumber: z.string().trim().min(1).max(50),
  dateOfBirth: z.string().datetime().nullable().optional(),
  classId: z.string().min(1),
});

const studentUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  studentNumber: z.string().trim().min(1).max(50).optional(),
  dateOfBirth: z.string().datetime().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  classId: z.string().min(1).nullable().optional(),
});

const listStudentsQuerySchema = z.object({
  search: z.string().trim().optional(),
  classId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const studentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/students",
    {
      onRequest: [authenticate, authorize("student.read")],
    },
    async (request, reply) => {
      const parsed = listStudentsQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid student list filters.",
          },
        });
      }

      const { search, classId, status, page, pageSize } = parsed.data;
      const schoolId = request.user.schoolId;

      if (!schoolId && request.user.role !== "SUPER_ADMIN") {
        return reply.status(403).send({
          error: {
            code: "SCHOOL_CONTEXT_REQUIRED",
            message: "A school context is required.",
          },
        });
      }

      const where = {
        ...(schoolId ? { schoolId } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" as const } },
                { lastName: { contains: search, mode: "insensitive" as const } },
                { studentNumber: { contains: search, mode: "insensitive" as const } },
                {
                  user: {
                    email: { contains: search, mode: "insensitive" as const },
                  },
                },
              ],
            }
          : {}),
        ...(classId
          ? {
              enrollments: {
                some: {
                  classId,
                  status: "ACTIVE" as const,
                  academicYear: {
                    status: "ACTIVE" as const,
                    ...(schoolId ? { schoolId } : {}),
                  },
                },
              },
            }
          : {}),
      };

      const [students, total] = await fastify.prisma.$transaction([
        fastify.prisma.student.findMany({
          where,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            schoolId: true,
            userId: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            status: true,
            user: {
              select: {
                email: true,
                status: true,
              },
            },
            enrollments: {
              where: {
                status: "ACTIVE",
                academicYear: {
                  status: "ACTIVE",
                  ...(schoolId ? { schoolId } : {}),
                },
              },
              orderBy: {
                academicYear: { startDate: "desc" },
              },
              take: 1,
              select: {
                id: true,
                status: true,
                enrolledAt: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    level: true,
                  },
                },
                academicYear: {
                  select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                  },
                },
              },
            },
            createdAt: true,
            updatedAt: true,
          },
        }),
        fastify.prisma.student.count({ where }),
      ]);

      return reply.send({
        students,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }
  );

  fastify.get(
    "/students/:studentId",
    {
      onRequest: [
        authenticate,
        authorizeStudentResource("student.read"),
      ],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };

      const student = await fastify.prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          schoolId: true,
          userId: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          status: true,
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
          enrollments: {
            orderBy: {
              academicYear: { startDate: "desc" },
            },
            select: {
              id: true,
              status: true,
              enrolledAt: true,
              endedAt: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  level: true,
                },
              },
              academicYear: {
                select: {
                  id: true,
                  name: true,
                  startDate: true,
                  endDate: true,
                  status: true,
                },
              },
            },
          },
          parents: {
            select: {
              id: true,
              relationship: true,
              isPrimary: true,
              parent: {
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
          medicalRecord: {
            select: {
              id: true,
              bloodGroup: true,
              allergies: true,
              medicalConditions: true,
              medications: true,
              emergencyContactName: true,
              emergencyContactPhone: true,
              doctorName: true,
              doctorPhone: true,
              notes: true,
            },
          },
          createdAt: true,
          updatedAt: true,
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

      return reply.send({ student });
    }
  );

  fastify.post(
    "/students",
    {
      onRequest: [authenticate, authorize("student.create")],
    },
    async (request, reply) => {
      const schoolId = request.user.schoolId;

      if (!schoolId) {
        return reply.status(403).send({
          error: {
            code: "SCHOOL_CONTEXT_REQUIRED",
            message: "A school context is required.",
          },
        });
      }

      const parsed = studentCreateSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid student data.",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const {
        email,
        password,
        firstName,
        lastName,
        studentNumber,
        dateOfBirth,
        classId,
      } = parsed.data;

      const normalizedEmail = email.toLowerCase();
      const normalizedStudentNumber = studentNumber.trim();

      const [existingUser, existingStudent] = await Promise.all([
        fastify.prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        }),
        fastify.prisma.student.findFirst({
          where: {
            schoolId,
            studentNumber: normalizedStudentNumber,
          },
          select: { id: true },
        }),
      ]);

      if (existingUser) {
        return reply.status(409).send({
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "A user with this email already exists.",
          },
        });
      }

      if (existingStudent) {
        return reply.status(409).send({
          error: {
            code: "STUDENT_NUMBER_ALREADY_EXISTS",
            message: "This student number already exists in the school.",
          },
        });
      }

      const schoolClass = await fastify.prisma.schoolClass.findFirst({
        where: {
          id: classId,
          schoolId,
          academicYear: {
            status: "ACTIVE",
            schoolId,
          },
        },
        select: {
          id: true,
          academicYearId: true,
        },
      });

      if (!schoolClass) {
        return reply.status(400).send({
          error: {
            code: "INVALID_CLASS",
            message: "The selected class is not active in this school.",
          },
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const parsedDateOfBirth = dateOfBirth
        ? new Date(dateOfBirth)
        : null;

      const result = await fastify.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            schoolId,
            email: normalizedEmail,
            passwordHash,
            firstName,
            lastName,
            role: "STUDENT",
            status: "ACTIVE",
          },
        });

        const student = await tx.student.create({
          data: {
            schoolId,
            userId: user.id,
            studentNumber: normalizedStudentNumber,
            firstName,
            lastName,
            dateOfBirth: parsedDateOfBirth,
            status: "ACTIVE",
          },
        });

        const enrollment = await tx.studentEnrollment.create({
          data: {
            studentId: student.id,
            academicYearId: schoolClass.academicYearId,
            classId: schoolClass.id,
            status: "ACTIVE",
          },
        });

        return { user, student, enrollment };
      });

      return reply.status(201).send({
        student: {
          id: result.student.id,
          schoolId: result.student.schoolId,
          userId: result.student.userId,
          studentNumber: result.student.studentNumber,
          firstName: result.student.firstName,
          lastName: result.student.lastName,
          dateOfBirth: result.student.dateOfBirth,
          status: result.student.status,
          email: result.user.email,
          enrollment: {
            id: result.enrollment.id,
            classId: result.enrollment.classId,
            academicYearId: result.enrollment.academicYearId,
            status: result.enrollment.status,
          },
          createdAt: result.student.createdAt,
          updatedAt: result.student.updatedAt,
        },
      });
    }
  );

  fastify.patch(
    "/students/:studentId",
    {
      onRequest: [
        authenticate,
        authorizeStudentResource("student.update"),
      ],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };

      const parsed = studentUpdateSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid student data.",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const data = parsed.data;

      const existing = await fastify.prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          schoolId: true,
          userId: true,
          status: true,
        },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student not found.",
          },
        });
      }

      const schoolId = existing.schoolId;

      if (data.email) {
        const normalizedEmail = data.email.toLowerCase();
        const emailOwner = await fastify.prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        if (emailOwner && emailOwner.id !== existing.userId) {
          return reply.status(409).send({
            error: {
              code: "EMAIL_ALREADY_EXISTS",
              message: "A user with this email already exists.",
            },
          });
        }
      }

      if (data.studentNumber) {
        const numberOwner = await fastify.prisma.student.findFirst({
          where: {
            schoolId,
            studentNumber: data.studentNumber.trim(),
            NOT: { id: studentId },
          },
          select: { id: true },
        });

        if (numberOwner) {
          return reply.status(409).send({
            error: {
              code: "STUDENT_NUMBER_ALREADY_EXISTS",
              message: "This student number already exists in the school.",
            },
          });
        }
      }

      let targetClass: {
        id: string;
        academicYearId: string;
      } | null = null;

      if (data.classId) {
        targetClass = await fastify.prisma.schoolClass.findFirst({
          where: {
            id: data.classId,
            schoolId,
            academicYear: {
              status: "ACTIVE",
              schoolId,
            },
          },
          select: {
            id: true,
            academicYearId: true,
          },
        });

        if (!targetClass) {
          return reply.status(400).send({
            error: {
              code: "INVALID_CLASS",
              message: "The selected class is not active in this school.",
            },
          });
        }
      }

      if (data.status === "ACTIVE" && !targetClass) {
        const activeEnrollment =
          await fastify.prisma.studentEnrollment.findFirst({
            where: {
              studentId,
              status: "ACTIVE",
              academicYear: {
                status: "ACTIVE",
                schoolId,
              },
            },
            select: { id: true },
          });

        if (!activeEnrollment) {
          return reply.status(400).send({
            error: {
              code: "ACTIVE_CLASS_REQUIRED",
              message:
                "A class is required to reactivate a student without an active enrollment.",
            },
          });
        }
      }

      const passwordHash = data.password
        ? await bcrypt.hash(data.password, 12)
        : undefined;

      const normalizedEmail = data.email
        ? data.email.toLowerCase()
        : undefined;

      const normalizedStudentNumber = data.studentNumber
        ? data.studentNumber.trim()
        : undefined;

      const parsedDateOfBirth =
        data.dateOfBirth !== undefined
          ? data.dateOfBirth
            ? new Date(data.dateOfBirth)
            : null
          : undefined;

      const result = await fastify.prisma.$transaction(async (tx) => {
        const student = await tx.student.update({
          where: { id: studentId },
          data: {
            ...(normalizedStudentNumber !== undefined
              ? { studentNumber: normalizedStudentNumber }
              : {}),
            ...(data.firstName !== undefined
              ? { firstName: data.firstName }
              : {}),
            ...(data.lastName !== undefined
              ? { lastName: data.lastName }
              : {}),
            ...(parsedDateOfBirth !== undefined
              ? { dateOfBirth: parsedDateOfBirth }
              : {}),
            ...(data.status !== undefined
              ? { status: data.status }
              : {}),
          },
          select: {
            id: true,
            schoolId: true,
            userId: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const user = await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(normalizedEmail !== undefined
              ? { email: normalizedEmail }
              : {}),
            ...(passwordHash !== undefined
              ? { passwordHash }
              : {}),
            ...(data.firstName !== undefined
              ? { firstName: data.firstName }
              : {}),
            ...(data.lastName !== undefined
              ? { lastName: data.lastName }
              : {}),
            ...(data.status !== undefined
              ? { status: data.status }
              : {}),
          },
          select: {
            id: true,
            email: true,
            status: true,
          },
        });

        if (targetClass) {
          const currentActiveEnrollment =
            await tx.studentEnrollment.findFirst({
              where: {
                studentId,
                status: "ACTIVE",
                academicYear: {
                  status: "ACTIVE",
                  schoolId,
                },
              },
              select: {
                id: true,
                academicYearId: true,
              },
            });

          if (
            currentActiveEnrollment &&
            currentActiveEnrollment.academicYearId ===
              targetClass.academicYearId
          ) {
            await tx.studentEnrollment.update({
              where: { id: currentActiveEnrollment.id },
              data: { classId: targetClass.id },
            });
          } else if (!currentActiveEnrollment) {
            await tx.studentEnrollment.create({
              data: {
                studentId,
                academicYearId: targetClass.academicYearId,
                classId: targetClass.id,
                status: "ACTIVE",
              },
            });
          } else {
            await tx.studentEnrollment.update({
              where: { id: currentActiveEnrollment.id },
              data: {
                status: "TRANSFERRED",
                endedAt: new Date(),
              },
            });

            await tx.studentEnrollment.create({
              data: {
                studentId,
                academicYearId: targetClass.academicYearId,
                classId: targetClass.id,
                status: "ACTIVE",
              },
            });
          }
        }

        if (data.status && data.status !== "ACTIVE") {
          await tx.studentEnrollment.updateMany({
            where: {
              studentId,
              status: "ACTIVE",
              academicYear: {
                status: "ACTIVE",
                schoolId,
              },
            },
            data: {
              status: "WITHDRAWN",
              endedAt: new Date(),
            },
          });
        }

        return { student, user };
      });

      return reply.send({
        student: {
          ...result.student,
          email: result.user.email,
          userStatus: result.user.status,
        },
      });
    }
  );

  fastify.delete(
    "/students/:studentId",
    {
      onRequest: [
        authenticate,
        authorizeStudentResource("student.delete"),
      ],
    },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };

      const existing = await fastify.prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          schoolId: true,
          userId: true,
          status: true,
        },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student not found.",
          },
        });
      }

      if (existing.status === "INACTIVE") {
        return reply.status(409).send({
          error: {
            code: "STUDENT_ALREADY_INACTIVE",
            message: "The student is already inactive.",
          },
        });
      }

      await fastify.prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id: studentId },
          data: { status: "INACTIVE" },
        });

        await tx.user.update({
          where: { id: existing.userId },
          data: { status: "INACTIVE" },
        });

        await tx.studentEnrollment.updateMany({
          where: {
            studentId,
            status: "ACTIVE",
            academicYear: {
              schoolId: existing.schoolId,
            },
          },
          data: {
            status: "WITHDRAWN",
            endedAt: new Date(),
          },
        });
      });

      return reply.send({
        message: "Student deactivated successfully.",
        studentId,
        status: "INACTIVE",
      });
    }
  );
};

export default studentRoutes;
