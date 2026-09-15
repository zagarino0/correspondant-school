import type { FastifyInstance } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeStudentResource } from "../middleware/authorize-student-resource.js";

export async function gradeRoutes(fastify: FastifyInstance) {
  /*
   * GET /grades/student/:studentId
   *
   * Retourne les notes d'un étudiant.
   */
  fastify.get(
    "/grades/student/:studentId",
    {
      onRequest: [
        authenticate,
        authorizeStudentResource("grade.read"),
      ],
    },
    async (request, reply) => {
      const { studentId } = request.params as {
        studentId: string;
      };

      const student = await fastify.prisma.student.findUnique({
        where: { id: studentId },
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

      const grades = await fastify.prisma.grade.findMany({
        where: { studentId },
        orderBy: [
          { evaluationDate: "desc" },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          enrollmentId: true,
          subject: true,
          title: true,
          value: true,
          maxValue: true,
          coefficient: true,
          evaluationDate: true,
          comment: true,
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

      return reply.send({
        student,
        grades,
      });
    }
  );

  /*
   * POST /grades
   *
   * Crée une note pour un étudiant.
   */
  fastify.post(
    "/grades",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeStudentResource("grade.create"),
      ],
    },
    async (request, reply) => {
      const body = request.body as {
        studentId?: string;
        enrollmentId?: string;
        subject?: string;
        title?: string;
        value?: number;
        maxValue?: number;
        coefficient?: number;
        evaluationDate?: string;
        comment?: string | null;
      };

      const {
        studentId,
        enrollmentId,
        subject,
        title,
        value,
        maxValue = 20,
        coefficient = 1,
        evaluationDate,
        comment,
      } = body;

      /*
       * Validation des champs obligatoires
       */
      if (
        !studentId ||
        !enrollmentId ||
        !subject ||
        !title ||
        value === undefined ||
        !evaluationDate
      ) {
        return reply.status(400).send({
          error: {
            code: "INVALID_GRADE_DATA",
            message:
              "studentId, enrollmentId, subject, title, value and evaluationDate are required.",
          },
        });
      }

      /*
       * Validation numérique
       */
      if (
        typeof value !== "number" ||
        !Number.isFinite(value)
      ) {
        return reply.status(400).send({
          error: {
            code: "INVALID_GRADE_VALUE",
            message: "The grade value is invalid.",
          },
        });
      }

      if (
        typeof maxValue !== "number" ||
        !Number.isFinite(maxValue) ||
        maxValue <= 0
      ) {
        return reply.status(400).send({
          error: {
            code: "INVALID_GRADE_MAX_VALUE",
            message: "The maximum grade value must be greater than zero.",
          },
        });
      }

      if (
        typeof coefficient !== "number" ||
        !Number.isFinite(coefficient) ||
        coefficient <= 0
      ) {
        return reply.status(400).send({
          error: {
            code: "INVALID_GRADE_COEFFICIENT",
            message: "The grade coefficient must be greater than zero.",
          },
        });
      }

      if (value < 0 || value > maxValue) {
        return reply.status(400).send({
          error: {
            code: "GRADE_VALUE_OUT_OF_RANGE",
            message:
              "The grade value must be between 0 and maxValue.",
          },
        });
      }

      /*
       * Validation de la date
       */
      const parsedEvaluationDate = new Date(evaluationDate);

      if (Number.isNaN(parsedEvaluationDate.getTime())) {
        return reply.status(400).send({
          error: {
            code: "INVALID_EVALUATION_DATE",
            message: "The evaluation date is invalid.",
          },
        });
      }

      /*
       * Vérification de l'étudiant
       */
      const student = await fastify.prisma.student.findUnique({
        where: { id: studentId },
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

      /*
       * Vérification de l'enrollment
       */
      const enrollment =
        await fastify.prisma.studentEnrollment.findUnique({
          where: { id: enrollmentId },
          select: {
            id: true,
            studentId: true,
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

      /*
       * Student ↔ enrollment
       */
      if (enrollment.studentId !== student.id) {
        return reply.status(400).send({
          error: {
            code: "ENROLLMENT_STUDENT_MISMATCH",
            message:
              "The enrollment does not belong to the specified student.",
          },
        });
      }

      /*
       * Enrollment ↔ school
       */
      if (enrollment.academicYear.schoolId !== student.schoolId) {
        return reply.status(400).send({
          error: {
            code: "ENROLLMENT_SCHOOL_MISMATCH",
            message:
              "The enrollment does not belong to the student's school.",
          },
        });
      }

      /*
       * Class ↔ school
       */
      if (enrollment.class.schoolId !== student.schoolId) {
        return reply.status(400).send({
          error: {
            code: "CLASS_SCHOOL_MISMATCH",
            message:
              "The class does not belong to the student's school.",
          },
        });
      }

      /*
       * Enrollment active
       */
      if (enrollment.status !== "ACTIVE") {
        return reply.status(400).send({
          error: {
            code: "ENROLLMENT_NOT_ACTIVE",
            message: "The student enrollment is not active.",
          },
        });
      }

      /*
       * Création
       */
      const createdGrade = await fastify.prisma.grade.create({
        data: {
          studentId: student.id,
          enrollmentId: enrollment.id,
          subject,
          title,
          value,
          maxValue,
          coefficient,
          evaluationDate: parsedEvaluationDate,
          comment: comment ?? null,
          recordedBy: request.user.sub,
        },
        select: {
          id: true,
          studentId: true,
          enrollmentId: true,
          subject: true,
          title: true,
          value: true,
          maxValue: true,
          coefficient: true,
          evaluationDate: true,
          comment: true,
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
        grade: createdGrade,
      });
    }
  );
}
