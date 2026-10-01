import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate.js";
import { publishToUser } from "../realtime/message-events.js";

const disciplineRoleSchema = z.enum(["STUDENT", "PARENT", "TEACHER"]);

function forbidden(reply: FastifyReply, message: string) {
  return reply.status(403).send({
    error: {
      code: "FORBIDDEN",
      message,
    },
  });
}

export async function disciplineVisibilityRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/me",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const role = request.user.role;

      if (!disciplineRoleSchema.safeParse(role).success) {
        return forbidden(reply, "This endpoint is only available to students, parents, and teachers.");
      }

      if (role === "STUDENT") {
        const student = await fastify.prisma.student.findFirst({
          where: {
            userId: request.user.sub,
            ...(request.user.schoolId ? { schoolId: request.user.schoolId } : {}),
          },
          select: { id: true, firstName: true, lastName: true, studentNumber: true },
        });

        if (!student) {
          return reply.status(404).send({
            error: { code: "STUDENT_PROFILE_NOT_FOUND", message: "Student profile not found." },
          });
        }

        const actions = await fastify.prisma.disciplinaryAction.findMany({
          where: {
            schoolId: request.user.schoolId,
            studentId: student.id,
            approvalStatus: "APPROVED",
          },
          orderBy: { actionAt: "desc" },
          take: 100,
          select: {
            id: true,
            studentId: true,
            incidentId: true,
            type: true,
            status: true,
            approvalStatus: true,
            description: true,
            decisionNote: true,
            actionAt: true,
            dueAt: true,
            completedAt: true,
            approvedAt: true,
            student: {
              select: { firstName: true, lastName: true, studentNumber: true },
            },
          },
        });

        return reply.send({ student, actions });
      }

      if (role === "PARENT") {
        const links = await fastify.prisma.parentStudent.findMany({
          where: { parentId: request.user.sub },
          select: {
            student: {
              select: {
                id: true,
                schoolId: true,
                firstName: true,
                lastName: true,
                studentNumber: true,
              },
            },
          },
        });

        const studentIds = links.map((link) => link.student.id);

        if (studentIds.length === 0) {
          return reply.send({ children: [], actions: [] });
        }

        const actions = await fastify.prisma.disciplinaryAction.findMany({
          where: {
            studentId: { in: studentIds },
            approvalStatus: "APPROVED",
          },
          orderBy: { actionAt: "desc" },
          take: 100,
          select: {
            id: true,
            studentId: true,
            incidentId: true,
            type: true,
            status: true,
            approvalStatus: true,
            description: true,
            decisionNote: true,
            actionAt: true,
            dueAt: true,
            completedAt: true,
            approvedAt: true,
            student: {
              select: { firstName: true, lastName: true, studentNumber: true },
            },
          },
        });

        return reply.send({
          children: links.map((link) => link.student),
          actions,
        });
      }

      if (!request.user.schoolId) {
        return reply.status(403).send({
          error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." },
        });
      }

      const teacherClasses = await fastify.prisma.teacherClass.findMany({
        where: {
          teacherId: request.user.sub,
          class: {
            schoolId: request.user.schoolId,
          },
        },
        select: { classId: true },
      });

      const classIds = teacherClasses.map((item) => item.classId);

      if (classIds.length === 0) {
        return reply.send({ incidents: [], actions: [] });
      }

      const studentFilter = {
        enrollments: {
          some: {
            classId: { in: classIds },
            status: "ACTIVE" as const,
          },
        },
      };

      const [incidents, actions] = await Promise.all([
        fastify.prisma.incident.findMany({
          where: {
            schoolId: request.user.schoolId,
            ...studentFilter,
          },
          orderBy: { occurredAt: "desc" },
          take: 100,
          select: {
            id: true,
            studentId: true,
            type: true,
            severity: true,
            status: true,
            description: true,
            occurredAt: true,
            location: true,
            resolutionNote: true,
            resolvedAt: true,
            reportedBy: true,
            student: {
              select: { firstName: true, lastName: true, studentNumber: true },
            },
          },
        }),
        fastify.prisma.disciplinaryAction.findMany({
          where: {
            schoolId: request.user.schoolId ?? undefined,
            ...studentFilter,
            approvalStatus: "APPROVED",
          },
          orderBy: { actionAt: "desc" },
          take: 100,
          select: {
            id: true,
            studentId: true,
            incidentId: true,
            type: true,
            status: true,
            approvalStatus: true,
            description: true,
            decisionNote: true,
            actionAt: true,
            dueAt: true,
            completedAt: true,
            approvedAt: true,
            student: {
              select: { firstName: true, lastName: true, studentNumber: true },
            },
          },
        }),
      ]);

      return reply.send({ incidents, actions });
    },
  );

  fastify.get(
    "/student/:studentId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };

      if (request.user.role !== "PARENT" && request.user.role !== "TEACHER" && request.user.role !== "SCHOOL_ADMIN") {
        return forbidden(reply, "You cannot access another student's discipline record.");
      }

      if (request.user.role === "PARENT") {
        const link = await fastify.prisma.parentStudent.findFirst({
          where: { parentId: request.user.sub, studentId },
          select: { id: true },
        });

        if (!link) {
          return forbidden(reply, "This student is not linked to your parent account.");
        }
      }

      if (!request.user.schoolId) {
        return reply.status(403).send({
          error: { code: "SCHOOL_REQUIRED", message: "A school assignment is required." },
        });
      }

      if (request.user.role === "TEACHER") {
        const access = await fastify.prisma.studentEnrollment.findFirst({
          where: {
            studentId,
            status: "ACTIVE",
            student: { schoolId: request.user.schoolId },
            academicYear: { status: "ACTIVE", schoolId: request.user.schoolId },
            class: {
              schoolId: request.user.schoolId,
              teacherAssignments: { some: { teacherId: request.user.sub } },
            },
          },
          select: { id: true },
        });

        if (!access) {
          return forbidden(reply, "This student is not assigned to one of your active classes.");
        }
      }

      const student = await fastify.prisma.student.findFirst({
        where: {
          id: studentId,
          schoolId: request.user.schoolId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentNumber: true,
        },
      });

      if (!student) {
        return reply.status(404).send({
          error: { code: "STUDENT_NOT_FOUND", message: "Student not found." },
        });
      }

      const actions = await fastify.prisma.disciplinaryAction.findMany({
        where: {
          studentId,
          approvalStatus: "APPROVED",
        },
        orderBy: { actionAt: "desc" },
        take: 100,
        select: {
          id: true,
          studentId: true,
          incidentId: true,
          type: true,
          status: true,
          approvalStatus: true,
          description: true,
          decisionNote: true,
          actionAt: true,
          dueAt: true,
          completedAt: true,
          approvedAt: true,
          student: {
            select: { firstName: true, lastName: true, studentNumber: true },
          },
        },
      });

      return reply.send({ student, actions });
    },
  );
}

export async function publishDisciplineApproval(
  prisma: FastifyInstance["prisma"],
  actionId: string,
): Promise<void> {
  const action = await prisma.disciplinaryAction.findUnique({
    where: { id: actionId },
    select: {
      id: true,
      studentId: true,
      schoolId: true,
      incidentId: true,
      type: true,
      status: true,
      approvalStatus: true,
      description: true,
      decisionNote: true,
      actionAt: true,
      dueAt: true,
      completedAt: true,
      approvedAt: true,
      student: {
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          studentNumber: true,
          parents: {
            select: { parentId: true },
          },
        },
      },
    },
  });

  if (!action || action.approvalStatus !== "APPROVED") {
    return;
  }

  const payload = {
    action: {
      id: action.id,
      studentId: action.studentId,
      incidentId: action.incidentId,
      type: action.type,
      status: action.status,
      approvalStatus: action.approvalStatus,
      description: action.description,
      decisionNote: action.decisionNote,
      actionAt: action.actionAt,
      dueAt: action.dueAt,
      completedAt: action.completedAt,
      approvedAt: action.approvedAt,
    },
  };

  const recipients = new Set<string>([
    action.student.userId,
    ...action.student.parents.map((parent) => parent.parentId),
  ]);

  const teacherAssignments = await prisma.teacherClass.findMany({
    where: {
      class: {
        schoolId: action.schoolId,
        enrollments: {
          some: {
            studentId: action.studentId,
            status: "ACTIVE",
          },
        },
      },
    },
    select: { teacherId: true },
  });

  for (const assignment of teacherAssignments) {
    recipients.add(assignment.teacherId);
  }

  for (const userId of recipients) {
    publishToUser(userId, "discipline:updated", payload);
  }
}
