import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

export async function schoolAdminDashboardRoutes(
  app: FastifyInstance,
): Promise<void> {

  const schoolAdminGuard = [
    authenticate,
    authorize("student.read"),
  ];

  app.post(
    "/classes",
    { onRequest: schoolAdminGuard },
    async (request, reply) => {
      if (request.user.role !== "SCHOOL_ADMIN" && request.user.role !== "SUPER_ADMIN") {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "School administrator access required." } });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.code(400).send({ error: { code: "SCHOOL_REQUIRED", message: "A school is required." } });
      }

      const schema = z.object({
        name: z.string().trim().min(1),
        level: z.string().trim().min(1),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Nom et niveau de classe sont obligatoires." } });
      }

      const academicYear = await app.prisma.academicYear.findFirst({
        where: { schoolId, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      });
      if (!academicYear) {
        return reply.code(404).send({ error: { code: "ACTIVE_ACADEMIC_YEAR_NOT_FOUND", message: "Aucune année scolaire active." } });
      }

      const existing = await app.prisma.schoolClass.findUnique({
        where: { academicYearId_name: { academicYearId: academicYear.id, name: parsed.data.name } },
      });
      if (existing) {
        return reply.code(409).send({ error: { code: "CLASS_ALREADY_EXISTS", message: "Cette classe existe déjà pour l'année active." } });
      }

      const schoolClass = await app.prisma.schoolClass.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          name: parsed.data.name,
          level: parsed.data.level,
        },
        select: { id: true, name: true, level: true },
      });

      return reply.code(201).send({ class: schoolClass });
    },
  );

  app.post(
    "/teachers",
    { onRequest: schoolAdminGuard },
    async (request, reply) => {
      if (request.user.role !== "SCHOOL_ADMIN" && request.user.role !== "SUPER_ADMIN") {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "School administrator access required." } });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.code(400).send({ error: { code: "SCHOOL_REQUIRED", message: "A school is required." } });
      }

      const schema = z.object({
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().min(1),
        email: z.string().trim().email(),
        password: z.string().min(6),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Nom, prénom, email et mot de passe (6 caractères minimum) sont obligatoires." } });
      }

      const email = parsed.data.email.toLowerCase();
      const existing = await app.prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({ error: { code: "EMAIL_ALREADY_EXISTS", message: "Cette adresse email est déjà utilisée." } });
      }

      const teacher = await app.prisma.user.create({
        data: {
          schoolId,
          email,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          passwordHash: await bcrypt.hash(parsed.data.password, 12),
          role: "TEACHER",
          status: "ACTIVE",
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
      });

      return reply.code(201).send({ teacher });
    },
  );

  app.post(
    "/personnel",
    { onRequest: schoolAdminGuard },
    async (request, reply) => {
      if (request.user.role !== "SCHOOL_ADMIN" && request.user.role !== "SUPER_ADMIN") {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "School administrator access required." } });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.code(400).send({ error: { code: "SCHOOL_REQUIRED", message: "A school is required." } });
      }

      const schema = z.object({
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().min(1),
        email: z.string().trim().email(),
        password: z.string().min(6),
        function: z.enum(["ADMINISTRATION", "SURVEILLANT", "SECRETARIAT", "COMPTABILITE", "INFIRMIER"]),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Tous les champs du personnel sont obligatoires." } });
      }

      const email = parsed.data.email.toLowerCase();
      const existing = await app.prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({ error: { code: "EMAIL_ALREADY_EXISTS", message: "Cette adresse email est déjà utilisée." } });
      }

      const staff = await app.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            schoolId,
            email,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            passwordHash: await bcrypt.hash(parsed.data.password, 12),
            role: "STAFF",
            status: "ACTIVE",
          },
        });

        const profile = await tx.staffProfile.create({
          data: {
            userId: user.id,
            function: parsed.data.function,
          },
        });

        await tx.staffAssignment.create({
          data: {
            staffId: profile.id,
            schoolId,
            startDate: new Date(),
            active: true,
          },
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          function: profile.function,
        };
      });

      return reply.code(201).send({ staff });
    },
  );

  app.patch(
    "/classes/:classId",
    { onRequest: schoolAdminGuard },
    async (request, reply) => {
      if (request.user.role !== "SCHOOL_ADMIN" && request.user.role !== "SUPER_ADMIN") {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "School administrator access required." } });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.code(400).send({ error: { code: "SCHOOL_REQUIRED", message: "A school is required." } });
      }

      const { classId } = request.params as { classId: string };
      const schema = z.object({
        name: z.string().trim().min(1),
        level: z.string().trim().min(1),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Nom et niveau de classe sont obligatoires." } });
      }

      const schoolClass = await app.prisma.schoolClass.findFirst({
        where: { id: classId, schoolId },
        select: { id: true, academicYearId: true },
      });

      if (!schoolClass) {
        return reply.code(404).send({ error: { code: "CLASS_NOT_FOUND", message: "Classe introuvable." } });
      }

      const duplicate = await app.prisma.schoolClass.findFirst({
        where: {
          academicYearId: schoolClass.academicYearId,
          name: parsed.data.name,
          id: { not: classId },
        },
        select: { id: true },
      });

      if (duplicate) {
        return reply.code(409).send({ error: { code: "CLASS_ALREADY_EXISTS", message: "Cette classe existe déjà pour l'année scolaire." } });
      }

      const updated = await app.prisma.schoolClass.update({
        where: { id: classId },
        data: { name: parsed.data.name, level: parsed.data.level },
        select: { id: true, name: true, level: true },
      });

      return reply.send({ class: updated });
    },
  );

  app.delete(
    "/classes/:classId",
    { onRequest: schoolAdminGuard },
    async (request, reply) => {
      if (request.user.role !== "SCHOOL_ADMIN" && request.user.role !== "SUPER_ADMIN") {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "School administrator access required." } });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.code(400).send({ error: { code: "SCHOOL_REQUIRED", message: "A school is required." } });
      }

      const { classId } = request.params as { classId: string };
      const schoolClass = await app.prisma.schoolClass.findFirst({
        where: { id: classId, schoolId },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              enrollments: {
                where: { status: "ACTIVE" },
              },
            },
          },
        },
      });

      if (!schoolClass) {
        return reply.code(404).send({ error: { code: "CLASS_NOT_FOUND", message: "Classe introuvable." } });
      }

      if (schoolClass._count.enrollments > 0) {
        return reply.code(409).send({
          error: {
            code: "CLASS_HAS_STUDENTS",
            message: "Impossible de supprimer une classe contenant encore des élèves actifs.",
          },
        });
      }

      await app.prisma.schoolClass.delete({ where: { id: classId } });

      return reply.send({ success: true, classId, name: schoolClass.name });
    },
  );

  app.get(
    "/schedules",
    { onRequest: schoolAdminGuard },
    async (request, reply) => {
      if (request.user.role !== "SCHOOL_ADMIN" && request.user.role !== "SUPER_ADMIN") {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "School administrator access required." } });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.code(400).send({ error: { code: "SCHOOL_REQUIRED", message: "A school is required." } });
      }

      const academicYear = await app.prisma.academicYear.findFirst({
        where: { schoolId, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, status: true },
      });

      if (!academicYear) {
        return reply.code(404).send({ error: { code: "ACTIVE_ACADEMIC_YEAR_NOT_FOUND", message: "Aucune année scolaire active." } });
      }

      const schedules = await app.prisma.schedule.findMany({
        where: { schoolId, academicYearId: academicYear.id },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        select: {
          id: true,
          classId: true,
          teacherId: true,
          subject: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
          class: { select: { id: true, name: true, level: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return reply.send({ academicYear, schedules });
    },
  );

  app.post(
    "/schedules",
    { onRequest: schoolAdminGuard },
    async (request, reply) => {
      if (request.user.role !== "SCHOOL_ADMIN" && request.user.role !== "SUPER_ADMIN") {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "School administrator access required." } });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.code(400).send({ error: { code: "SCHOOL_REQUIRED", message: "A school is required." } });
      }

      const schema = z.object({
        classId: z.string().min(1),
        teacherId: z.string().min(1),
        subject: z.string().trim().min(1),
        dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]),
        startTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/),
        endTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/),
        room: z.string().trim().max(100).optional().nullable(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success || parsed.data.startTime >= parsed.data.endTime) {
        return reply.code(400).send({
          error: { code: "VALIDATION_ERROR", message: "Classe, enseignant, matière, jour et horaires valides sont obligatoires." },
        });
      }

      const academicYear = await app.prisma.academicYear.findFirst({
        where: { schoolId, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, status: true },
      });

      if (!academicYear) {
        return reply.code(404).send({ error: { code: "ACTIVE_ACADEMIC_YEAR_NOT_FOUND", message: "Aucune année scolaire active." } });
      }

      const [schoolClass, teacher] = await Promise.all([
        app.prisma.schoolClass.findFirst({
          where: { id: parsed.data.classId, schoolId, academicYearId: academicYear.id },
          select: { id: true, name: true },
        }),
        app.prisma.user.findFirst({
          where: { id: parsed.data.teacherId, schoolId, role: "TEACHER", status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true },
        }),
      ]);

      if (!schoolClass) {
        return reply.code(404).send({ error: { code: "CLASS_NOT_FOUND", message: "Classe introuvable pour l'année active." } });
      }

      if (!teacher) {
        return reply.code(404).send({ error: { code: "TEACHER_NOT_FOUND", message: "Enseignant introuvable." } });
      }

      const conflict = await app.prisma.schedule.findFirst({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          dayOfWeek: parsed.data.dayOfWeek,
          OR: [
            { classId: parsed.data.classId },
            { teacherId: parsed.data.teacherId },
          ],
          startTime: { lt: parsed.data.endTime },
          endTime: { gt: parsed.data.startTime },
        },
        select: { id: true, classId: true, teacherId: true, startTime: true, endTime: true },
      });

      if (conflict) {
        return reply.code(409).send({
          error: {
            code: "SCHEDULE_CONFLICT",
            message: "Ce créneau entre en conflit avec un autre cours de la classe ou de l'enseignant.",
          },
        });
      }

      const schedule = await app.prisma.schedule.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          classId: parsed.data.classId,
          teacherId: parsed.data.teacherId,
          subject: parsed.data.subject,
          dayOfWeek: parsed.data.dayOfWeek,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          room: parsed.data.room?.trim() || null,
        },
        select: {
          id: true,
          classId: true,
          teacherId: true,
          subject: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
        },
      });

      return reply.code(201).send({ schedule });
    },
  );

  app.patch(
    "/schedules/:scheduleId",
    { onRequest: schoolAdminGuard },
    async (request, reply) => {
      if (request.user.role !== "SCHOOL_ADMIN" && request.user.role !== "SUPER_ADMIN") {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "School administrator access required." } });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.code(400).send({ error: { code: "SCHOOL_REQUIRED", message: "A school is required." } });
      }

      const { scheduleId } = request.params as { scheduleId: string };
      const schema = z.object({
        classId: z.string().min(1),
        teacherId: z.string().min(1),
        subject: z.string().trim().min(1),
        dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]),
        startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        room: z.string().trim().max(100).optional().nullable(),
      });
      const parsed = schema.safeParse(request.body);

      if (!parsed.success || parsed.data.startTime >= parsed.data.endTime) {
        return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Données de créneau invalides." } });
      }

      const academicYear = await app.prisma.academicYear.findFirst({
        where: { schoolId, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        select: { id: true },
      });

      if (!academicYear) {
        return reply.code(404).send({ error: { code: "ACTIVE_ACADEMIC_YEAR_NOT_FOUND", message: "Aucune année scolaire active." } });
      }

      const existing = await app.prisma.schedule.findFirst({
        where: { id: scheduleId, schoolId, academicYearId: academicYear.id },
        select: { id: true },
      });
      if (!existing) {
        return reply.code(404).send({ error: { code: "SCHEDULE_NOT_FOUND", message: "Créneau introuvable." } });
      }

      const [schoolClass, teacher] = await Promise.all([
        app.prisma.schoolClass.findFirst({
          where: { id: parsed.data.classId, schoolId, academicYearId: academicYear.id },
          select: { id: true },
        }),
        app.prisma.user.findFirst({
          where: { id: parsed.data.teacherId, schoolId, role: "TEACHER", status: "ACTIVE" },
          select: { id: true },
        }),
      ]);

      if (!schoolClass) {
        return reply.code(404).send({ error: { code: "CLASS_NOT_FOUND", message: "Classe introuvable pour l'année active." } });
      }
      if (!teacher) {
        return reply.code(404).send({ error: { code: "TEACHER_NOT_FOUND", message: "Enseignant introuvable." } });
      }

      const conflict = await app.prisma.schedule.findFirst({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          id: { not: scheduleId },
          dayOfWeek: parsed.data.dayOfWeek,
          OR: [{ classId: parsed.data.classId }, { teacherId: parsed.data.teacherId }],
          startTime: { lt: parsed.data.endTime },
          endTime: { gt: parsed.data.startTime },
        },
        select: { id: true },
      });

      if (conflict) {
        return reply.code(409).send({
          error: { code: "SCHEDULE_CONFLICT", message: "Ce créneau entre en conflit avec un autre cours de la classe ou de l'enseignant." },
        });
      }

      const schedule = await app.prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          classId: parsed.data.classId,
          teacherId: parsed.data.teacherId,
          subject: parsed.data.subject,
          dayOfWeek: parsed.data.dayOfWeek,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          room: parsed.data.room?.trim() || null,
        },
        select: {
          id: true,
          classId: true,
          teacherId: true,
          subject: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
        },
      });

      return reply.send({ schedule });
    },
  );

  app.delete(
    "/schedules/:scheduleId",
    { onRequest: schoolAdminGuard },
    async (request, reply) => {
      if (request.user.role !== "SCHOOL_ADMIN" && request.user.role !== "SUPER_ADMIN") {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "School administrator access required." } });
      }

      const schoolId = request.user.schoolId;
      if (!schoolId) {
        return reply.code(400).send({ error: { code: "SCHOOL_REQUIRED", message: "A school is required." } });
      }

      const { scheduleId } = request.params as { scheduleId: string };
      const schedule = await app.prisma.schedule.findFirst({
        where: { id: scheduleId, schoolId },
        select: { id: true },
      });

      if (!schedule) {
        return reply.code(404).send({ error: { code: "SCHEDULE_NOT_FOUND", message: "Créneau introuvable." } });
      }

      await app.prisma.schedule.delete({ where: { id: scheduleId } });
      return reply.send({ success: true, scheduleId });
    },
  );

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
