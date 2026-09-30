import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import type { Permission } from "../authorization/permissions.js";
import {
  hasPermission,
  type Role,
} from "../authorization/roles.js";
import { hasStaffPermission } from "../authorization/staff-permissions.js";

export function authorize(permission: Permission) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const role = request.user.role as Role;

    if (role === "STAFF") {
      const staffProfile =
        await request.server.prisma.staffProfile.findUnique({
          where: {
            userId: request.user.sub,
          },
          select: {
            function: true,
          },
        });

      if (!staffProfile) {
        request.log.warn(
          {
            userId: request.user.sub,
            role,
            permission,
          },
          "Authorization denied: staff profile not found",
        );

        return reply.status(403).send({
          error: {
            code: "STAFF_PROFILE_NOT_FOUND",
            message: "Staff profile not found.",
          },
        });
      }

      const allowed = hasStaffPermission(staffProfile.function, permission);

      // Keep this at info level so a 403 can be diagnosed with the default
      // LOG_LEVEL=info used by the development server. Never log credentials.
      request.log.info(
        {
          userId: request.user.sub,
          role,
          staffFunction: staffProfile.function,
          permission,
          allowed,
          schoolId: request.user.schoolId,
          path: request.url,
          method: request.method,
        },
        "Authorization check",
      );

      if (!allowed) {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to perform this action.",
          },
        });
      }

      return;
    }

    const allowed = hasPermission(role, permission);

    request.log.info(
      {
        userId: request.user.sub,
        role,
        permission,
        allowed,
        schoolId: request.user.schoolId,
        path: request.url,
        method: request.method,
      },
      "Authorization check",
    );

    if (!allowed) {
      return reply.status(403).send({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
        },
      });
    }
  };
}
