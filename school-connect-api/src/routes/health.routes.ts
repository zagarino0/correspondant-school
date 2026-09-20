import type { FastifyPluginAsync } from "fastify";

import { env } from "../config/env.js";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async () => {
    return {
      status: "ok",
      service: "school-connect-api",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get("/health/database", async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;

      return {
        status: "ok",
        database: "connected",
      };
    } catch (error) {
      fastify.log.error({ err: error }, "Database health check failed");

      return reply.status(503).send({
        status: "error",
        database: "unavailable",
      });
    }
  });

  fastify.get("/health/config", async () => {
    let migrations = "unknown";

    try {
      await fastify.prisma.$queryRaw`SELECT 1 FROM "_prisma_migrations" LIMIT 1`;
      migrations = "table-present";
    } catch {
      migrations = "table-missing-or-uninitialized";
    }

    return {
      status: "ok",
      service: "school-connect-api",
      environment: env.NODE_ENV,
      configuration: {
        databaseUrlConfigured: Boolean(env.DATABASE_URL),
        jwtSecretConfigured: env.JWT_SECRET.length >= 32,
        corsConfigured: Boolean(env.CORS_ORIGIN),
        migrations,
      },
      timestamp: new Date().toISOString(),
    };
  });
};

export default healthRoutes;
