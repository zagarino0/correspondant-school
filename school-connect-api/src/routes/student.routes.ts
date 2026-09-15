import type { FastifyPluginAsync } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeStudentResource } from "../middleware/authorize-student-resource.js";

const studentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/students/:studentId",
    {
      onRequest: [
        authenticate,
        authorizeStudentResource("student.read"),
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

      if (!student) {
        return reply.status(404).send({
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student not found.",
          },
        });
      }

      return reply.send({
        student,
      });
    }
  );
};

export default studentRoutes;