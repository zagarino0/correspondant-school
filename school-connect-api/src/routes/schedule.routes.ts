import type { FastifyInstance } from "fastify";
import { ScheduleDay } from "@prisma/client";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeResource } from "../middleware/authorize-resource.js";

export async function scheduleRoutes(
  app: FastifyInstance,
): Promise<void> {
  /**
   * ==================================================
   * GET /api/v1/schedules/teacher/me
   * ==================================================
   *
   * Emploi du temps hebdomadaire de l'enseignant connecté.
   * Le teacherId provient du JWT : un enseignant ne peut
   * consulter que ses propres créneaux.
   */
  app.get(
    "/teacher/me",
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
      const teacherId = request.user.sub;
      const userSchoolId = request.user.schoolId;

      const teacher = await app.prisma.user.findFirst({
        where: {
          id: teacherId,
          role: "TEACHER",
          status: "ACTIVE",
          ...(userSchoolId ? { schoolId: userSchoolId } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolId: true,
        },
      });

      if (!teacher) {
        return reply.code(404).send({
          error: {
            code: "TEACHER_NOT_FOUND",
            message: "Teacher profile not found.",
          },
        });
      }

      const schedules = await app.prisma.schedule.findMany({
        where: {
          teacherId: teacher.id,
          ...(teacher.schoolId ? { schoolId: teacher.schoolId } : {}),
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { startTime: "asc" },
          { endTime: "asc" },
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
          class: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      });

      return reply.code(200).send({
        teacher,
        schedules,
      });
    },
  );

  /**
   * ==================================================
   * GET /api/v1/schedules
   * ==================================================
   *
   * Liste des créneaux.
   *
   * Filtres optionnels :
   * - schoolId
   * - academicYearId
   * - classId
   * - teacherId
   * - dayOfWeek
   *
   * Les filtres sont combinés avec AND.
   */
  app.get(
    "/",
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
      const query = request.query as {
        schoolId?: string;
        academicYearId?: string;
        classId?: string;
        teacherId?: string;
        dayOfWeek?: string;
      };

      /**
       * Validation du jour.
       */
      const validDays = [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ];

      if (
        query.dayOfWeek &&
        !validDays.includes(query.dayOfWeek)
      ) {
        return reply.code(400).send({
          error: "INVALID_DAY_OF_WEEK",
          message:
            "dayOfWeek doit être un jour de la semaine valide.",
        });
      }

      /**
       * Isolation par établissement.
       *
       * Un utilisateur rattaché à une école ne peut
       * consulter que les créneaux de cette école.
       *
       * SUPER_ADMIN possède schoolId = null et peut
       * donc effectuer une recherche globale ou filtrée.
       */
      const userSchoolId = request.user.schoolId;

      if (
        userSchoolId &&
        query.schoolId &&
        query.schoolId !== userSchoolId
      ) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message:
            "Vous n'êtes pas autorisé à accéder aux créneaux de cet établissement.",
        });
      }

      /**
       * Pour un utilisateur rattaché à une école,
       * son schoolId devient automatiquement le filtre.
       */
      const schoolId =
        userSchoolId ?? query.schoolId;

      /**
       * Construction du filtre Prisma.
       */
      const isSurveillant =
        request.user.role === "STAFF" &&
        (request.user as typeof request.user & { staffFunction?: string }).staffFunction === "SURVEILLANT";

      const activeAcademicYear = isSurveillant
        ? await app.prisma.academicYear.findFirst({
            where: {
              ...(schoolId ? { schoolId } : {}),
              status: "ACTIVE",
            },
            select: { id: true },
            orderBy: { startDate: "desc" },
          })
        : null;

      const where = {
        ...(schoolId
          ? {
              schoolId,
            }
          : {}),

        ...(activeAcademicYear
          ? {
              academicYearId: activeAcademicYear.id,
            }
          : {}),

        ...(query.academicYearId
          ? {
              academicYearId:
                query.academicYearId,
            }
          : {}),

        ...(query.classId
          ? {
              classId: query.classId,
            }
          : {}),

        ...(query.teacherId
          ? {
              teacherId: query.teacherId,
            }
          : {}),

        ...(query.dayOfWeek
          ? {
              dayOfWeek:
                query.dayOfWeek as ScheduleDay,
            }
          : {}),
      };

      /**
       * Recherche des créneaux.
       *
       * Tri :
       * 1. jour
       * 2. heure de début
       * 3. heure de fin
       */
      const schedules =
        await app.prisma.schedule.findMany({
          where,
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
            class: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

      return reply.code(200).send({
        schedules,
      });
    },
  );

  /**
   * ==================================================
   * GET /api/v1/schedules/:id
   * ==================================================
   *
   * Détail d'un créneau.
   */
  app.get(
    "/:id",
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
      const params = request.params as {
        id: string;
      };

      /**
       * Recherche du créneau.
       */
      const schedule =
        await app.prisma.schedule.findUnique({
          where: {
            id: params.id,
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

      /**
       * Créneau inexistant.
       */
      if (!schedule) {
        return reply.code(404).send({
          error: {
            code: "SCHEDULE_NOT_FOUND",
            message: "Schedule not found.",
          },
        });
      }

      /**
       * Isolation par établissement.
       */
      const userSchoolId = request.user.schoolId;

      if (
        userSchoolId &&
        schedule.schoolId !== userSchoolId
      ) {
        return reply.code(403).send({
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message:
              "You do not have access to this resource.",
          },
        });
      }

      return reply.code(200).send({
        schedule,
      });
    },
  );


    /**
   * ==================================================
   * PATCH /api/v1/schedules/:id
   * ==================================================
   *
   * Modification partielle d'un créneau.
   *
   * Champs modifiables :
   * - subject
   * - dayOfWeek
   * - startTime
   * - endTime
   * - room
   *
   * Champs non modifiables :
   * - id
   * - schoolId
   * - academicYearId
   * - classId
   * - teacherId
   * - createdAt
   * - updatedAt
   */
  app.patch(
    "/:id",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "schedule.update",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const params = request.params as {
        id: string;
      };

      const body = request.body as {
        subject?: unknown;
        dayOfWeek?: unknown;
        startTime?: unknown;
        endTime?: unknown;
        room?: unknown;
      };

      /**
       * ==================================================
       * 1. Vérification de l'existence du créneau
       * ==================================================
       */
      const existingSchedule =
        await app.prisma.schedule.findUnique({
          where: {
            id: params.id,
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

      if (!existingSchedule) {
        return reply.code(404).send({
          error: {
            code: "SCHEDULE_NOT_FOUND",
            message: "Schedule not found.",
          },
        });
      }

      /**
       * ==================================================
       * 2. Isolation par établissement
       * ==================================================
       */
      const userSchoolId =
        request.user.schoolId;

      if (
        userSchoolId &&
        existingSchedule.schoolId !== userSchoolId
      ) {
        return reply.code(403).send({
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message:
              "You do not have access to this resource.",
          },
        });
      }

      /**
       * ==================================================
       * 3. Vérification du body
       * ==================================================
       */
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
      ) {
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Le body doit être un objet JSON valide.",
          },
        });
      }

      /**
       * Champs autorisés.
       */
      const allowedFields = new Set([
        "subject",
        "dayOfWeek",
        "startTime",
        "endTime",
        "room",
      ]);

      /**
       * Champs réellement envoyés.
       */
      const bodyKeys = Object.keys(body);

      /**
       * Vérification des champs inconnus.
       */
      const unknownFields = bodyKeys.filter(
        (key) => !allowedFields.has(key),
      );

      if (unknownFields.length > 0) {
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Le body contient un ou plusieurs champs non modifiables.",
          },
        });
      }

      /**
       * Au moins un champ doit être envoyé.
       */
      if (bodyKeys.length === 0) {
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Au moins un champ modifiable est requis.",
          },
        });
      }

      /**
       * ==================================================
       * 4. Calcul des nouvelles valeurs
       * ==================================================
       *
       * Pour un PATCH partiel, les champs absents
       * conservent leur valeur actuelle.
       */
      let subject =
        existingSchedule.subject;

      let dayOfWeek =
        existingSchedule.dayOfWeek;

      let startTime =
        existingSchedule.startTime;

      let endTime =
        existingSchedule.endTime;

      let room =
        existingSchedule.room;

      /**
       * ==================================================
       * 5. Validation de subject
       * ==================================================
       */
      if ("subject" in body) {
        if (
          typeof body.subject !== "string" ||
          body.subject.trim() === ""
        ) {
          return reply.code(400).send({
            error: {
              code: "VALIDATION_ERROR",
              message:
                "subject ne peut pas être vide.",
            },
          });
        }

        subject = body.subject.trim();
      }

      /**
       * ==================================================
       * 6. Validation de dayOfWeek
       * ==================================================
       */
      const validDays = [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ];

      if ("dayOfWeek" in body) {
        if (
          typeof body.dayOfWeek !== "string" ||
          !validDays.includes(body.dayOfWeek)
        ) {
          return reply.code(400).send({
            error: {
              code: "INVALID_DAY_OF_WEEK",
              message:
                "dayOfWeek doit être un jour de la semaine valide.",
            },
          });
        }

        dayOfWeek =
          body.dayOfWeek as ScheduleDay;
      }

      /**
       * ==================================================
       * 7. Validation de startTime
       * ==================================================
       */
      const timeRegex =
        /^([01]\d|2[0-3]):([0-5]\d)$/;

      if ("startTime" in body) {
        if (
          typeof body.startTime !== "string" ||
          !timeRegex.test(body.startTime)
        ) {
          return reply.code(400).send({
            error: {
              code: "INVALID_START_TIME",
              message:
                "startTime doit respecter le format HH:mm.",
            },
          });
        }

        startTime = body.startTime;
      }

      /**
       * ==================================================
       * 8. Validation de endTime
       * ==================================================
       */
      if ("endTime" in body) {
        if (
          typeof body.endTime !== "string" ||
          !timeRegex.test(body.endTime)
        ) {
          return reply.code(400).send({
            error: {
              code: "INVALID_END_TIME",
              message:
                "endTime doit respecter le format HH:mm.",
            },
          });
        }

        endTime = body.endTime;
      }

      /**
       * ==================================================
       * 9. Validation de l'intervalle
       * ==================================================
       *
       * On valide les valeurs finales, après fusion
       * entre les valeurs existantes et les nouvelles.
       */
      if (startTime >= endTime) {
        return reply.code(400).send({
          error: {
            code: "INVALID_TIME_RANGE",
            message:
              "startTime doit être inférieur à endTime.",
          },
        });
      }

      /**
       * ==================================================
       * 10. Validation de room
       * ==================================================
       *
       * room peut être :
       * - une chaîne non vide
       * - null
       *
       * Une chaîne vide est normalisée en null.
       */
      if ("room" in body) {
        if (
          body.room !== null &&
          typeof body.room !== "string"
        ) {
          return reply.code(400).send({
            error: {
              code: "VALIDATION_ERROR",
              message:
                "room doit être une chaîne ou null.",
            },
          });
        }

        if (body.room === null) {
          room = null;
        } else {
          const trimmedRoom =
            body.room.trim();

          room =
            trimmedRoom === ""
              ? null
              : trimmedRoom;
        }
      }

      /**
       * ==================================================
       * 11. Vérification des chevauchements
       * ==================================================
       *
       * Même :
       * - schoolId
       * - academicYearId
       * - classId
       * - dayOfWeek
       *
       * Mais on exclut le créneau courant.
       */
      const overlappingSchedule =
        await app.prisma.schedule.findFirst({
          where: {
            id: {
              not: existingSchedule.id,
            },

            schoolId:
              existingSchedule.schoolId,

            academicYearId:
              existingSchedule.academicYearId,

            classId:
              existingSchedule.classId,

            dayOfWeek,

            startTime: {
              lt: endTime,
            },

            endTime: {
              gt: startTime,
            },
          },

          select: {
            id: true,
          },
        });

      if (overlappingSchedule) {
        return reply.code(409).send({
          error: {
            code: "SCHEDULE_OVERLAP",
            message:
              "Ce créneau chevauche un créneau existant pour cette classe.",
          },
        });
      }

      /**
       * ==================================================
       * 12. Mise à jour
       * ==================================================
       */
      const schedule =
        await app.prisma.schedule.update({
          where: {
            id: existingSchedule.id,
          },

          data: {
            subject,
            dayOfWeek,
            startTime,
            endTime,
            room,
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

      /**
       * ==================================================
       * 13. Réponse
       * ==================================================
       */
      return reply.code(200).send({
        schedule,
      });
    },
  );

  /**
   * ==================================================
   * POST /api/v1/schedules
   * ==================================================
   *
   * Création d'un créneau.
   *
   * Règles métier :
   * - format HH:mm
   * - startTime < endTime
   * - teacher = TEACHER
   * - teacher actif
   * - teacher dans la même école
   * - academicYear dans la même école
   * - class dans la même école
   * - class rattachée à academicYear
   * - pas de chevauchement
   * - les créneaux qui se touchent sont autorisés
   */
  app.post(
    "/",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "schedule.create",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const body = request.body as {
        schoolId?: string;
        academicYearId?: string;
        classId?: string;
        teacherId?: string;
        subject?: string;
        dayOfWeek?: string;
        startTime?: string;
        endTime?: string;
        room?: string | null;
      };

      /**
       * Champs obligatoires.
       */
      const requiredFields = [
        "schoolId",
        "academicYearId",
        "classId",
        "teacherId",
        "subject",
        "dayOfWeek",
        "startTime",
        "endTime",
      ] as const;

      for (const field of requiredFields) {
        if (
          !body[field] ||
          typeof body[field] !== "string" ||
          body[field]?.trim() === ""
        ) {
          return reply.code(400).send({
            error: {
              code: "VALIDATION_ERROR",
              message: `${field} est obligatoire.`,
            },
          });
        }
      }

      /**
       * Validation du jour.
       */
      const validDays = [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ];

      if (
        !body.dayOfWeek ||
        !validDays.includes(body.dayOfWeek)
      ) {
        return reply.code(400).send({
          error: {
            code: "INVALID_DAY_OF_WEEK",
            message:
              "dayOfWeek doit être un jour de la semaine valide.",
          },
        });
      }

      /**
       * Validation du format horaire.
       *
       * Format strict : HH:mm
       */
      const timeRegex =
        /^([01]\d|2[0-3]):([0-5]\d)$/;

      if (
        !body.startTime ||
        !timeRegex.test(body.startTime)
      ) {
        return reply.code(400).send({
          error: {
            code: "INVALID_START_TIME",
            message:
              "startTime doit respecter le format HH:mm.",
          },
        });
      }

      if (
        !body.endTime ||
        !timeRegex.test(body.endTime)
      ) {
        return reply.code(400).send({
          error: {
            code: "INVALID_END_TIME",
            message:
              "endTime doit respecter le format HH:mm.",
          },
        });
      }

      /**
       * Vérification startTime < endTime.
       */
      if (
        body.startTime >= body.endTime
      ) {
        return reply.code(400).send({
          error: {
            code: "INVALID_TIME_RANGE",
            message:
              "startTime doit être inférieur à endTime.",
          },
        });
      }

      /**
       * Vérification de l'établissement.
       */
      const school =
        await app.prisma.school.findUnique({
          where: {
            id: body.schoolId!,
          },
          select: {
            id: true,
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

      /**
       * Isolation école pour les utilisateurs
       * possédant un schoolId.
       */
      const userSchoolId =
        request.user.schoolId;

      if (
        userSchoolId &&
        body.schoolId !== userSchoolId
      ) {
        return reply.code(403).send({
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message:
              "You do not have access to this resource.",
          },
        });
      }

      /**
       * Vérification de l'année académique.
       */
      const academicYear =
        await app.prisma.academicYear.findFirst({
          where: {
            id: body.academicYearId!,
            schoolId: body.schoolId!,
          },
          select: {
            id: true,
          },
        });

      if (!academicYear) {
        return reply.code(404).send({
          error: {
            code: "ACADEMIC_YEAR_NOT_FOUND",
            message:
              "Academic year not found.",
          },
        });
      }

      /**
       * Vérification de la classe.
       *
       * La classe doit :
       * - appartenir à l'école
       * - appartenir à l'année académique
       */
      const schoolClass =
        await app.prisma.schoolClass.findFirst({
          where: {
            id: body.classId!,
            schoolId: body.schoolId!,
            academicYearId:
              body.academicYearId!,
          },
          select: {
            id: true,
          },
        });

      if (!schoolClass) {
        return reply.code(404).send({
          error: {
            code: "CLASS_NOT_FOUND",
            message:
              "Class not found.",
          },
        });
      }

      /**
       * Vérification du professeur.
       *
       * Le teacher doit :
       * - exister
       * - avoir le rôle TEACHER
       * - être actif
       * - appartenir à la même école
       */
      const teacher =
        await app.prisma.user.findFirst({
          where: {
            id: body.teacherId!,
            role: "TEACHER",
            status: "ACTIVE",
            OR: [
              {
                schoolId:
                  body.schoolId!,
              },
            ],
          },
          select: {
            id: true,
          },
        });

      if (!teacher) {
        return reply.code(404).send({
          error: {
            code: "TEACHER_NOT_FOUND",
            message:
              "Teacher not found.",
          },
        });
      }

      /**
       * Vérification des chevauchements.
       *
       * Deux créneaux se chevauchent si :
       *
       * existing.startTime < new.endTime
       * AND
       * existing.endTime > new.startTime
       *
       * Les créneaux qui se touchent sont donc autorisés :
       *
       * 08:00-10:00
       * 10:00-12:00
       */
      const overlappingSchedule =
        await app.prisma.schedule.findFirst({
          where: {
            schoolId: body.schoolId!,
            academicYearId:
              body.academicYearId!,
            classId: body.classId!,
            dayOfWeek:
              body.dayOfWeek as ScheduleDay,

            startTime: {
              lt: body.endTime!,
            },

            endTime: {
              gt: body.startTime!,
            },
          },

          select: {
            id: true,
          },
        });

      if (overlappingSchedule) {
        return reply.code(409).send({
          error: {
            code: "SCHEDULE_OVERLAP",
            message:
              "Ce créneau chevauche un créneau existant pour cette classe.",
          },
        });
      }

      /**
       * Création du créneau.
       */
      const schedule =
        await app.prisma.schedule.create({
          data: {
            schoolId: body.schoolId!,
            academicYearId:
              body.academicYearId!,
            classId: body.classId!,
            teacherId: body.teacherId!,
            subject: body.subject!.trim(),
            dayOfWeek:
              body.dayOfWeek as ScheduleDay,
            startTime: body.startTime!,
            endTime: body.endTime!,
            room:
              body.room === undefined ||
              body.room === null ||
              body.room.trim() === ""
                ? null
                : body.room.trim(),
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

      return reply.code(201).send({
        schedule,
      });
    },
  );

    /**
   * ==================================================
   * DELETE /api/v1/schedules/:id
   * ==================================================
   *
   * Suppression d'un créneau.
   */
  app.delete(
    "/:id",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "schedule.delete",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const params = request.params as {
        id: string;
      };

      /**
       * ==================================================
       * 1. Vérification de l'existence du créneau
       * ==================================================
       */
      const existingSchedule =
        await app.prisma.schedule.findUnique({
          where: {
            id: params.id,
          },
          select: {
            id: true,
            schoolId: true,
          },
        });

      if (!existingSchedule) {
        return reply.code(404).send({
          error: {
            code: "SCHEDULE_NOT_FOUND",
            message: "Schedule not found.",
          },
        });
      }

      /**
       * ==================================================
       * 2. Isolation par établissement
       * ==================================================
       */
      const userSchoolId =
        request.user.schoolId;

      if (
        userSchoolId &&
        existingSchedule.schoolId !== userSchoolId
      ) {
        return reply.code(403).send({
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message:
              "You do not have access to this resource.",
          },
        });
      }

      /**
       * ==================================================
       * 3. Suppression du créneau
       * ==================================================
       */
      await app.prisma.schedule.delete({
        where: {
          id: params.id,
        },
      });

      return reply.code(204).send();
    },
  );

}
