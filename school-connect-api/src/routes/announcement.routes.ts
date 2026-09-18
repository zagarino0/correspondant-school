import type { FastifyInstance } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeResource } from "../middleware/authorize-resource.js";

export async function announcementRoutes(
  app: FastifyInstance,
): Promise<void> {
  /**
   * POST /api/v1/announcements
   *
   * Crée une annonce pour une ou plusieurs classes et audiences.
   * La résolution des destinataires sera effectuée dans l'étape suivante.
   */
  app.post(
    "/",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "announcement.create",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const body = request.body as {
        title?: unknown;
        content?: unknown;
        classIds?: unknown;
        audiences?: unknown;
      };

      if (
        typeof body.title !== "string" ||
        body.title.trim().length === 0
      ) {
        return reply.code(400).send({
          error: {
            code: "TITLE_REQUIRED",
            message: "title est obligatoire.",
          },
        });
      }

      if (
        typeof body.content !== "string" ||
        body.content.trim().length === 0
      ) {
        return reply.code(400).send({
          error: {
            code: "CONTENT_REQUIRED",
            message: "content est obligatoire.",
          },
        });
      }

      if (!Array.isArray(body.classIds) || body.classIds.length === 0) {
        return reply.code(400).send({
          error: {
            code: "CLASS_IDS_REQUIRED",
            message: "classIds doit contenir au moins une classe.",
          },
        });
      }

      if (
        body.classIds.some(
          (classId) => typeof classId !== "string" || classId.trim().length === 0,
        )
      ) {
        return reply.code(400).send({
          error: {
            code: "INVALID_CLASS_IDS",
            message: "classIds doit contenir uniquement des identifiants valides.",
          },
        });
      }

      const classIds = body.classIds as string[];
      const uniqueClassIds = [...new Set(classIds)];

      if (uniqueClassIds.length !== classIds.length) {
        return reply.code(400).send({
          error: {
            code: "DUPLICATE_CLASS_IDS",
            message: "classIds ne doit pas contenir de doublons.",
          },
        });
      }

      const allowedAudiences = new Set([
        "STUDENTS",
        "PARENTS",
        "TEACHERS",
      ]);

      if (!Array.isArray(body.audiences) || body.audiences.length === 0) {
        return reply.code(400).send({
          error: {
            code: "AUDIENCES_REQUIRED",
            message: "audiences doit contenir au moins une audience.",
          },
        });
      }

      if (
        body.audiences.some(
          (audience) =>
            typeof audience !== "string" || !allowedAudiences.has(audience),
        )
      ) {
        return reply.code(400).send({
          error: {
            code: "INVALID_AUDIENCES",
            message:
              "audiences doit contenir uniquement STUDENTS, PARENTS ou TEACHERS.",
          },
        });
      }

      const audiences = body.audiences as Array<
        "STUDENTS" | "PARENTS" | "TEACHERS"
      >;

      if (new Set(audiences).size !== audiences.length) {
        return reply.code(400).send({
          error: {
            code: "DUPLICATE_AUDIENCES",
            message: "audiences ne doit pas contenir de doublons.",
          },
        });
      }

      const user = await app.prisma.user.findUnique({
        where: {
          id: request.user.sub,
        },
        select: {
          id: true,
          schoolId: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
          },
        });
      }

      if (!user.schoolId) {
        return reply.code(404).send({
          error: {
            code: "SCHOOL_NOT_FOUND",
            message: "No school is associated with this user.",
          },
        });
      }

      if (
        request.user.schoolId &&
        request.user.schoolId !== user.schoolId
      ) {
        return reply.code(403).send({
          error: {
            code: "SCHOOL_ACCESS_DENIED",
            message:
              "Vous ne pouvez pas créer une annonce dans cet établissement.",
          },
        });
      }

      const activeAcademicYear =
        await app.prisma.academicYear.findFirst({
          where: {
            schoolId: user.schoolId,
            status: "ACTIVE",
          },
          orderBy: {
            startDate: "desc",
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
        });

      if (!activeAcademicYear) {
        return reply.code(404).send({
          error: {
            code: "ACTIVE_ACADEMIC_YEAR_NOT_FOUND",
            message:
              "No active academic year was found for this school.",
          },
        });
      }

      const classes = await app.prisma.schoolClass.findMany({
        where: {
          id: {
            in: uniqueClassIds,
          },
          schoolId: user.schoolId,
          academicYearId: activeAcademicYear.id,
        },
        select: {
          id: true,
          name: true,
          level: true,
        },
      });

      if (classes.length !== uniqueClassIds.length) {
        const foundClassIds = new Set(classes.map((schoolClass) => schoolClass.id));
        const invalidClassIds = uniqueClassIds.filter(
          (classId) => !foundClassIds.has(classId),
        );

        return reply.code(400).send({
          error: {
            code: "INVALID_CLASS_TARGETS",
            message:
              "Une ou plusieurs classes ne sont pas rattachées à l'établissement et à l'année scolaire active.",
            classIds: invalidClassIds,
          },
        });
      }

      const announcement = await app.prisma.$transaction(async (tx) => {
        const createdAnnouncement = await tx.announcement.create({
          data: {
            schoolId: user.schoolId!,
            academicYearId: activeAcademicYear.id,
            createdBy: user.id,
            title: (body.title as string).trim(),
            content: (body.content as string).trim(),
            audiences,
            classTargets: {
              create: uniqueClassIds.map((classId) => ({
                classId,
              })),
            },
          },
          select: {
            id: true,
            schoolId: true,
            academicYearId: true,
            createdBy: true,
            title: true,
            content: true,
            audiences: true,
            createdAt: true,
            updatedAt: true,
            classTargets: {
              select: {
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

        const recipientUserIds = new Set<string>();

        if (audiences.includes("STUDENTS") || audiences.includes("PARENTS")) {
          const enrollments = await tx.studentEnrollment.findMany({
            where: {
              academicYearId: activeAcademicYear.id,
              classId: {
                in: uniqueClassIds,
              },
              status: "ACTIVE",
            },
            select: {
              student: {
                select: {
                  userId: true,
                  parents: {
                    select: {
                      parentId: true,
                    },
                  },
                },
              },
            },
          });

          for (const enrollment of enrollments) {
            if (audiences.includes("STUDENTS")) {
              recipientUserIds.add(enrollment.student.userId);
            }

            if (audiences.includes("PARENTS")) {
              for (const parentLink of enrollment.student.parents) {
                recipientUserIds.add(parentLink.parentId);
              }
            }
          }
        }

        if (audiences.includes("TEACHERS")) {
          const teacherAssignments = await tx.teacherClass.findMany({
            where: {
              classId: {
                in: uniqueClassIds,
              },
              teacher: {
                role: "TEACHER",
              },
            },
            select: {
              teacherId: true,
            },
          });

          for (const assignment of teacherAssignments) {
            recipientUserIds.add(assignment.teacherId);
          }
        }

        if (recipientUserIds.size > 0) {
          await tx.announcementRecipient.createMany({
            data: [...recipientUserIds].map((userId) => ({
              announcementId: createdAnnouncement.id,
              userId,
            })),
            skipDuplicates: true,
          });
        }

        return createdAnnouncement;
      });

      return reply.code(201).send({
        announcement,
      });
    },
  );

  app.patch(
    "/:announcementId/read",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "announcement.read",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const params = request.params as {
        announcementId?: unknown;
      };

      if (
        typeof params.announcementId !== "string" ||
        params.announcementId.trim().length === 0
      ) {
        return reply.code(400).send({
          error: {
            code: "ANNOUNCEMENT_ID_REQUIRED",
            message: "announcementId est obligatoire.",
          },
        });
      }

      const userId = request.user.sub;
      const userSchoolId = request.user.schoolId;

      const user = await app.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          schoolId: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
          },
        });
      }

      if (
        userSchoolId &&
        user.schoolId !== userSchoolId
      ) {
        return reply.code(403).send({
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message:
              "You do not have access to this resource.",
          },
        });
      }

      if (!user.schoolId) {
        return reply.code(404).send({
          error: {
            code: "SCHOOL_NOT_FOUND",
            message: "No school is associated with this user.",
          },
        });
      }

      const activeAcademicYear =
        await app.prisma.academicYear.findFirst({
          where: {
            schoolId: user.schoolId,
            status: "ACTIVE",
          },
          orderBy: {
            startDate: "desc",
          },
          select: {
            id: true,
          },
        });

      if (!activeAcademicYear) {
        return reply.code(404).send({
          error: {
            code: "ACTIVE_ACADEMIC_YEAR_NOT_FOUND",
            message:
              "No active academic year was found for this school.",
          },
        });
      }

      const recipient =
        await app.prisma.announcementRecipient.findFirst({
          where: {
            announcementId: params.announcementId,
            userId,
            announcement: {
              schoolId: user.schoolId,
              academicYearId: activeAcademicYear.id,
              deletedAt: null,
            },
          },
          select: {
            id: true,
            announcementId: true,
            isRead: true,
            readAt: true,
          },
        });

      if (!recipient) {
        return reply.code(404).send({
          error: {
            code: "ANNOUNCEMENT_RECIPIENT_NOT_FOUND",
            message:
              "Cette annonce n'est pas accessible pour cet utilisateur.",
          },
        });
      }

      const updatedRecipient =
        await app.prisma.announcementRecipient.update({
          where: {
            id: recipient.id,
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
          select: {
            id: true,
            announcementId: true,
            isRead: true,
            readAt: true,
          },
        });

      return reply.code(200).send({
        recipient: updatedRecipient,
      });
    },
  );

  app.get(
    "/me",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "announcement.read",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const userSchoolId = request.user.schoolId;

      const user = await app.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          schoolId: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
          },
        });
      }

      if (
        userSchoolId &&
        user.schoolId !== userSchoolId
      ) {
        return reply.code(403).send({
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message:
              "You do not have access to this resource.",
          },
        });
      }

      if (!user.schoolId) {
        return reply.code(404).send({
          error: {
            code: "SCHOOL_NOT_FOUND",
            message: "No school is associated with this user.",
          },
        });
      }

      const activeAcademicYear =
        await app.prisma.academicYear.findFirst({
          where: {
            schoolId: user.schoolId,
            status: "ACTIVE",
          },
          orderBy: {
            startDate: "desc",
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
        });

      if (!activeAcademicYear) {
        return reply.code(404).send({
          error: {
            code: "ACTIVE_ACADEMIC_YEAR_NOT_FOUND",
            message:
              "No active academic year was found for this school.",
          },
        });
      }

      const recipients =
        await app.prisma.announcementRecipient.findMany({
          where: {
            userId,
            announcement: {
              schoolId: user.schoolId,
              academicYearId: activeAcademicYear.id,
              deletedAt: null,
            },
          },
          orderBy: {
            announcement: {
              createdAt: "desc",
            },
          },
          select: {
            id: true,
            isRead: true,
            readAt: true,
            createdAt: true,
            announcement: {
              select: {
                id: true,
                title: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                creator: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                  },
                },
                classTargets: {
                  select: {
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
            },
          },
        });

      return reply.code(200).send({
        academicYear: activeAcademicYear,
        count: recipients.length,
        announcements: recipients.map((recipient) => ({
          id: recipient.announcement.id,
          title: recipient.announcement.title,
          content: recipient.announcement.content,
          createdAt: recipient.announcement.createdAt,
          updatedAt: recipient.announcement.updatedAt,
          isRead: recipient.isRead,
          readAt: recipient.readAt,
          recipientId: recipient.id,
          recipientCreatedAt: recipient.createdAt,
          creator: recipient.announcement.creator,
          classes: recipient.announcement.classTargets.map(
            (target) => target.class,
          ),
        })),
      });
    },
  );
}
