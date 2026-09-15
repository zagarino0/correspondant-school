import type { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (fastify) => {

  
    fastify.get("/health", async () => {
    return {
      status: "ok",
      service: "school-connect-api",
      timestamp: new Date().toISOString(),
    };
  });
   
  fastify.get("/health/database", async () => {
    await fastify.prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      database: "connected",
    };
  });
};

export default healthRoutes;