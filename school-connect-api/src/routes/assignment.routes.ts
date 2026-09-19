import type { FastifyInstance } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeStudentResource } from "../middleware/authorize-student-resource.js";
import { authorizeResource } from "../middleware/authorize-resource.js";

export async function assignmentRoutes(
  app: FastifyInstance,
): Promise<void> {
  /**
   * GET /api/v1/assignments/teacher
   *
   * Contexte pédagogique du professeur :
   * emploi du temps -> classe + matière -> devoirs.
   */
  app.get(
    "/teacher",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource("assignment.read", async () => true),
      ],
    },
    async (request, reply) => {
      if (request.user.role !== "TEACHER") {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "Teacher access required.",
        });
      }

      const query = request.query as { scheduleId?: string };
      if (!query.scheduleId) {
        return reply.code(400).send({
          error: "SCHEDULE_ID_REQUIRED",
          message: "scheduleId est obligatoire.",
        });
      }

      const schedule = await app.prisma.schedule.findFirst({
        where: {
          id: query.scheduleId,
          teacherId: request.user.sub,
        },
        select: {
          id: true,
          classId: true,
          subject: true,
          dayOfWeek: true,
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
      });

      if (!schedule) {
        return reply.code(404).send({
          error: "SCHEDULE_NOT_FOUND",
          message: "Créneau introuvable ou non affecté à cet enseignant.",
        });
      }

      const assignments = await app.prisma.assignment.findMany({
        where: {
          classId: schedule.classId,
          subject: schedule.subject,
        },
        orderBy: [
          { dueDate: "asc" },
          { assignedAt: "desc" },
        ],
        select: {
          id: true,
          studentId: true,
          classId: true,
          subject: true,
          title: true,
          description: true,
          assignedAt: true,
          dueDate: true,
          status: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          class: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const students = await app.prisma.studentEnrollment.findMany({
        where: {
          classId: schedule.classId,
          status: "ACTIVE",
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
        select: {
          id: true,
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return reply.send({
        schedule,
        assignments,
        students: students.map((enrollment) => ({
          enrollmentId: enrollment.id,
          student: enrollment.student,
        })),
      });
    },
  );

  /**
   * GET /api/v1/assignments/me
   *
   * Retourne :
   * - les devoirs individuels de l'élève connecté
   * - les devoirs attribués à toute sa classe
   *
   * L'élève est résolu depuis le JWT via User.id -> Student.userId.
   */
  app.get(
    "/me",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource("assignment.read", async () => true),
      ],
    },
    async (request, reply) => {
      const student = await app.prisma.student.findUnique({
        where: {
          userId: request.user.sub,
        },
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,

          enrollments: {
            where: {
              status: "ACTIVE",
            },
            orderBy: {
              enrolledAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              academicYearId: true,
              classId: true,

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
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!student) {
        return reply.code(404).send({
          error: "STUDENT_NOT_FOUND",
          message: "Élève introuvable pour l'utilisateur connecté.",
        });
      }

      const enrollment = student.enrollments[0];

      if (!enrollment) {
        return reply.code(404).send({
          error: "ACTIVE_ENROLLMENT_NOT_FOUND",
          message:
            "Aucune inscription active trouvée pour cet élève.",
        });
      }

      const assignments =
        await app.prisma.assignment.findMany({
          where: {
            classId: enrollment.classId,
            OR: [
              {
                studentId: student.id,
              },
              {
                studentId: null,
              },
            ],
          },
          orderBy: [
            {
              dueDate: "asc",
            },
            {
              assignedAt: "desc",
            },
          ],
          select: {
            id: true,
            studentId: true,
            classId: true,
            subject: true,
            title: true,
            description: true,
            assignedAt: true,
            dueDate: true,
            status: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
            class: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        });

      return reply.code(200).send({
        student: {
          id: student.id,
          studentNumber: student.studentNumber,
          firstName: student.firstName,
          lastName: student.lastName,
        },
        enrollment: {
          id: enrollment.id,
          academicYear: enrollment.academicYear,
          class: enrollment.class,
        },
        count: assignments.length,
        assignments,
      });
    },
  );

  /**
   * GET /api/v1/assignments/student/:studentId
   *
   * Retourne :
   * - les devoirs individuels de l'élève
   * - les devoirs attribués à toute sa classe
   */
  app.get(
    "/student/:studentId",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeStudentResource("assignment.read"),
      ],
    },
    async (request, reply) => {
      const { studentId } = request.params as {
        studentId: string;
      };

      const student = await app.prisma.student.findUnique({
        where: {
          id: studentId,
        },
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
          schoolId: true,

          enrollments: {
            where: {
              status: "ACTIVE",
            },
            orderBy: {
              enrolledAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              academicYearId: true,
              classId: true,

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
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!student) {
        return reply.code(404).send({
          error: "STUDENT_NOT_FOUND",
          message: "Élève introuvable.",
        });
      }

      const enrollment = student.enrollments[0];

      if (!enrollment) {
        return reply.code(404).send({
          error: "ACTIVE_ENROLLMENT_NOT_FOUND",
          message:
            "Aucune inscription active trouvée pour cet élève.",
        });
      }

      const assignments =
        await app.prisma.assignment.findMany({
          where: {
            classId: enrollment.classId,

            OR: [
              {
                studentId: student.id,
              },
              {
                studentId: null,
              },
            ],
          },

          orderBy: [
            {
              dueDate: "asc",
            },
            {
              assignedAt: "desc",
            },
          ],

          select: {
            id: true,
            studentId: true,
            classId: true,

            subject: true,
            title: true,
            description: true,

            assignedAt: true,
            dueDate: true,

            status: true,
            createdBy: true,

            createdAt: true,
            updatedAt: true,

            class: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },

            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        });

      return reply.code(200).send({
        student: {
          id: student.id,
          studentNumber: student.studentNumber,
          firstName: student.firstName,
          lastName: student.lastName,
        },

        enrollment: {
          id: enrollment.id,
          academicYear: enrollment.academicYear,
          class: enrollment.class,
        },

        count: assignments.length,

        assignments,
      });
    },
  );

  /**
   * POST /api/v1/assignments
   *
   * Crée :
   *
   * 1. un devoir pour toute une classe
   *    studentId = null
   *
   * 2. un devoir individuel
   *    studentId = <studentId>
   *
   * L'accès à la création est d'abord contrôlé
   * par RBAC via assignment.create.
   *
   * Le contrôle ABAC classe/élève est ensuite effectué
   * dans le handler.
   */
  app.post(
    "/",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "assignment.create",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const body = request.body as {
        studentId?: string | null;
        classId?: string;
        subject?: string;
        title?: string;
        description?: string | null;
        assignedAt?: string;
        dueDate?: string | null;
      };

      const user = request.user;

      if (!body.classId) {
        return reply.code(400).send({
          error: "CLASS_ID_REQUIRED",
          message: "classId est obligatoire.",
        });
      }

      if (!body.subject) {
        return reply.code(400).send({
          error: "SUBJECT_REQUIRED",
          message: "subject est obligatoire.",
        });
      }

      if (!body.title) {
        return reply.code(400).send({
          error: "TITLE_REQUIRED",
          message: "title est obligatoire.",
        });
      }

      if (!body.assignedAt) {
        return reply.code(400).send({
          error: "ASSIGNED_AT_REQUIRED",
          message: "assignedAt est obligatoire.",
        });
      }

      const schoolClass =
        await app.prisma.schoolClass.findUnique({
          where: {
            id: body.classId,
          },
          select: {
            id: true,
            schoolId: true,
            academicYearId: true,
            name: true,
          },
        });

      if (!schoolClass) {
        return reply.code(404).send({
          error: "CLASS_NOT_FOUND",
          message: "Classe introuvable.",
        });
      }

      if (
        user.schoolId !== null &&
        schoolClass.schoolId !== user.schoolId
      ) {
        return reply.code(403).send({
          error: "SCHOOL_ACCESS_DENIED",
          message:
            "Vous ne pouvez pas créer un devoir dans cet établissement.",
        });
      }

      if (user.role === "TEACHER") {
        const teacherClass =
          await app.prisma.teacherClass.findUnique({
            where: {
              teacherId_classId: {
                teacherId: user.sub,
                classId: body.classId,
              },
            },
            select: {
              id: true,
            },
          });

        if (!teacherClass) {
          return reply.code(403).send({
            error: "CLASS_ACCESS_DENIED",
            message:
              "Vous n'êtes pas assigné à cette classe.",
          });
        }
      }

      if (body.studentId) {
        const student =
          await app.prisma.student.findUnique({
            where: {
              id: body.studentId,
            },
            select: {
              id: true,
              schoolId: true,

              enrollments: {
                where: {
                  classId: body.classId,
                  status: "ACTIVE",
                },
                select: {
                  id: true,
                  classId: true,
                },
              },
            },
          });

        if (!student) {
          return reply.code(404).send({
            error: "STUDENT_NOT_FOUND",
            message: "Élève introuvable.",
          });
        }

        if (student.schoolId !== schoolClass.schoolId) {
          return reply.code(400).send({
            error: "STUDENT_SCHOOL_MISMATCH",
            message:
              "L'élève n'appartient pas au même établissement que la classe.",
          });
        }

        if (student.enrollments.length === 0) {
          return reply.code(400).send({
            error: "STUDENT_CLASS_MISMATCH",
            message:
              "L'élève n'est pas inscrit dans cette classe.",
          });
        }
      }

      const assignedAt = new Date(body.assignedAt);

      if (Number.isNaN(assignedAt.getTime())) {
        return reply.code(400).send({
          error: "INVALID_ASSIGNED_AT",
          message:
            "assignedAt doit être une date valide.",
        });
      }

      let dueDate: Date | null = null;

      if (body.dueDate) {
        dueDate = new Date(body.dueDate);

        if (Number.isNaN(dueDate.getTime())) {
          return reply.code(400).send({
            error: "INVALID_DUE_DATE",
            message:
              "dueDate doit être une date valide.",
          });
        }
      }

      if (dueDate && dueDate < assignedAt) {
        return reply.code(400).send({
          error: "INVALID_DUE_DATE_RANGE",
          message:
            "dueDate doit être postérieure ou égale à assignedAt.",
        });
      }

      const assignment =
        await app.prisma.assignment.create({
          data: {
            studentId: body.studentId ?? null,
            classId: body.classId,

            subject: body.subject,
            title: body.title,
            description: body.description ?? null,

            assignedAt,
            dueDate,

            status: "PENDING",

            createdBy: user.sub,
          },

          select: {
            id: true,
            studentId: true,
            classId: true,

            subject: true,
            title: true,
            description: true,

            assignedAt: true,
            dueDate: true,

            status: true,
            createdBy: true,

            createdAt: true,
            updatedAt: true,

            class: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        });

      return reply.code(201).send({
        assignment,
      });
    },
  );
}
