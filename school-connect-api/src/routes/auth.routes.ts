import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";

import {
  generateRefreshToken,
  hashRefreshToken,
  parseRefreshTokenDuration,
} from "../services/auth.service.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { authorizeStudentResource } from "../middleware/authorize-student-resource.js";
import { env } from "../config/env.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid email or password.",
        },
      });
    }

    const { email, password } = parsed.data;

    const user = await fastify.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      return reply.status(401).send({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
    }

    if (user.status !== "ACTIVE") {
      return reply.status(403).send({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "This account is not active.",
        },
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return reply.status(401).send({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
    }

    const accessToken = await fastify.jwt.sign({
      sub: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date(
      Date.now() + parseRefreshTokenDuration(env.JWT_REFRESH_EXPIRES_IN)
    );

    await fastify.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        staffFunction: user.role === "STAFF"
          ? (await fastify.prisma.staffProfile.findUnique({
              where: { userId: user.id },
              select: { function: true },
            }))?.function ?? null
          : null,
      },
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });
  });

    fastify.post("/refresh", async (request, reply) => {
    const refreshSchema = z.object({
      refreshToken: z.string().min(1),
    });

    const parsed = refreshSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Refresh token is required.",
        },
      });
    }

    const { refreshToken } = parsed.data;

    const refreshTokenHash = hashRefreshToken(refreshToken);

    const storedToken = await fastify.prisma.refreshToken.findUnique({
      where: {
        tokenHash: refreshTokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      return reply.status(401).send({
        error: {
          code: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token.",
        },
      });
    }

    if (storedToken.revokedAt) {
      return reply.status(401).send({
        error: {
          code: "REFRESH_TOKEN_REVOKED",
          message: "Refresh token has been revoked.",
        },
      });
    }

    if (storedToken.expiresAt <= new Date()) {
      return reply.status(401).send({
        error: {
          code: "REFRESH_TOKEN_EXPIRED",
          message: "Refresh token has expired.",
        },
      });
    }

    if (storedToken.user.status !== "ACTIVE") {
      return reply.status(403).send({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "This account is not active.",
        },
      });
    }

    const user = storedToken.user;

    const newAccessToken = await fastify.jwt.sign({
      sub: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

    const newExpiresAt = new Date(
      Date.now() +
        parseRefreshTokenDuration(env.JWT_REFRESH_EXPIRES_IN)
    );

    await fastify.prisma.$transaction([
      fastify.prisma.refreshToken.update({
        where: {
          id: storedToken.id,
        },
        data: {
          revokedAt: new Date(),
        },
      }),

      fastify.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        staffFunction: user.role === "STAFF"
          ? (await fastify.prisma.staffProfile.findUnique({
              where: { userId: user.id },
              select: { function: true },
            }))?.function ?? null
          : null,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer",
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });
  });

    fastify.get(
    "/me",
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const user = await fastify.prisma.user.findUnique({
        where: {
          id: request.user.sub,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          schoolId: true,
          staffProfile: {
            select: { function: true },
          },
        },
      });

      if (!user) {
        return reply.status(404).send({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
          },
        });
      }

      return reply.send({
        user: {
          ...user,
          staffFunction: user.staffProfile?.function ?? null,
        },
      });
    }
  );




};



export default authRoutes;