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
import { attendanceRoutes } from "../routes/attendance.routes.js";
import { gradeRoutes } from "../routes/grade.routes.js";
import { assignmentRoutes } from "../routes/assignment.routes.js";
import { scheduleRoutes } from "../routes/schedule.routes.js";
import { studentScheduleRoutes } from "../routes/student-schedule.routes.js";
import { announcementRoutes } from "../routes/announcement.routes.js";
import { aiRoutes } from "../routes/ai.routes.js";

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
  await app.register(jwtPlugin);
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
  await app.register(aiRoutes, {
    prefix: "/api/v1/ai",
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
