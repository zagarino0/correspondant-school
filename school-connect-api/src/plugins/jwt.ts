import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";

import { env } from "../config/env.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      role: string;
      schoolId: string | null;
    };

    user: {
      sub: string;
      role: string;
      schoolId: string | null;
    };
  }
}

export default fp(async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
  });
});