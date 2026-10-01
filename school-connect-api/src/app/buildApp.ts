import Fastify, { type FastifyError } from "fastify";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";

import { env } from "../config/env.js";
import prismaPlugin from "../plugins/prisma.js";
import authRoutes from "../routes/auth.routes.js";
import healthRoutes from "../routes/health.routes.js";
import userRoutes from "../routes/user.routes.js";
import schoolRoutes from "../routes/school.routes.js";
import studentRoutes from "../routes/student.routes.js";
import studentClassRoutes from "../routes/student-class.routes.js";
import { attendanceRoutes } from "../routes/attendance.routes.js";
import { gradeRoutes } from "../routes/grade.routes.js";
import { assignmentRoutes } from "../routes/assignment.routes.js";
import { scheduleRoutes } from "../routes/schedule.routes.js";
import { studentScheduleRoutes } from "../routes/student-schedule.routes.js";
import { announcementRoutes } from "../routes/announcement.routes.js";
import { messageRoutes } from "../routes/message.routes.js";
import websocketPlugin from "../realtime/websocket.js";
import { aiRoutes } from "../routes/ai.routes.js";
import { teacherRoutes } from "../routes/teacher.routes.js";
import { parentRoutes } from "../routes/parent.routes.js";
import { schoolAdminDashboardRoutes } from "../routes/school-admin-dashboard.routes.js";
import medicalRoutes from "../routes/medical.routes.js";
import medicalHistoryRoutes from "../routes/medical-history.routes.js";
import medicalReportRoutes from "../routes/medical-report.routes.js";
import { surveillantRoutes } from "../routes/surveillant.routes.js";
import { surveillantSchoolLifeRoutes } from "../routes/surveillant-school-life.routes.js";
import { surveillantAuthorizationRoutes } from "../routes/surveillant-authorization.routes.js";
import { disciplineVisibilityRoutes } from "../routes/discipline-visibility.routes.js";
import documentRoutes from "../routes/document.routes.js";
import meetingRoutes from "../routes/meeting.routes.js";
import paymentRoutes from "../routes/payment.routes.js";
import ticketRoutes from "../routes/ticket.routes.js";
import { startSmsWorker } from "../services/sms.service.js";

import jwtPlugin from "../plugins/jwt.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  await app.register(helmet);

  await app.register(cors, {
    origin:
      env.CORS_ORIGIN === "*"
        ? true
        : env.CORS_ORIGIN
            .split(",")
            .map((origin) => origin.trim()),
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(sensible);

  await app.register(prismaPlugin);
  const stopSmsWorker = startSmsWorker(app.prisma);
  app.addHook("onClose", async () => {
    stopSmsWorker();
  });
  await app.register(jwtPlugin);
  await app.register(websocketPlugin);
  await app.register(healthRoutes, {
    prefix: "/api/v1",
  });
  await app.register(authRoutes, {
    prefix: "/api/v1/auth",
  });
  await app.register(userRoutes, {
    prefix: "/api/v1",
  });
  await app.register(schoolRoutes, {
    prefix: "/api/v1",
  });
  await app.register(studentRoutes, {
    prefix: "/api/v1",
  });
  await app.register(studentClassRoutes, {
    prefix: "/api/v1",
  });
  await app.register(parentRoutes, {
    prefix: "/api/v1",
  });
  await app.register(schoolAdminDashboardRoutes, {
    prefix: "/api/v1/school-admin",
  });
  await app.register(medicalRoutes, {
    prefix: "/api/v1/medical",
  });
  await app.register(medicalHistoryRoutes, {
    prefix: "/api/v1/medical-history",
  });
  await app.register(medicalReportRoutes, {
    prefix: "/api/v1/medical-reports",
  });
  await app.register(surveillantRoutes, {
    prefix: "/api/v1/surveillant",
  });
  await app.register(surveillantSchoolLifeRoutes, {
    prefix: "/api/v1/surveillant/school-life",
  });
  await app.register(surveillantAuthorizationRoutes, {
    prefix: "/api/v1/surveillant/school-life",
  });
  await app.register(disciplineVisibilityRoutes, {
    prefix: "/api/v1/discipline",
  });
  await app.register(attendanceRoutes, {
    prefix: "/api/v1",
  });
  await app.register(gradeRoutes, {
    prefix: "/api/v1",
  });
  await app.register(assignmentRoutes, {
    prefix: "/api/v1/assignments",
  });
  await app.register(studentScheduleRoutes, {
    prefix: "/api/v1/schedules",
  });
  await app.register(scheduleRoutes, {
    prefix: "/api/v1/schedules",
  });
  await app.register(announcementRoutes, {
    prefix: "/api/v1/announcements",
  });
  await app.register(messageRoutes, {
    prefix: "/api/v1/messages",
  });
  await app.register(aiRoutes, {
    prefix: "/api/v1/ai",
  });
  await app.register(documentRoutes, {
    prefix: "/api/v1",
  });
  await app.register(meetingRoutes, {
    prefix: "/api/v1",
  });
  await app.register(paymentRoutes, {
    prefix: "/api/v1",
  });
  await app.register(ticketRoutes, {
    prefix: "/api/v1",
  });
  await app.register(teacherRoutes, {
    prefix: "/api/v1/teachers",
  });

  app.setErrorHandler(
    (error: FastifyError, request, reply) => {
      request.log.error(error);

      return reply.status(
        error.statusCode ?? 500
      ).send({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message:
            env.NODE_ENV === "production"
              ? "Internal server error"
              : error.message,
        },
      });
    });

  return app;
}
