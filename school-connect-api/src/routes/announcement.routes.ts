import type { FastifyInstance } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeResource } from "../middleware/authorize-resource.js";

export async function announcementRoutes(
  app: FastifyInstance,
): Promise<void> {
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
