import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import type { Permission } from "../authorization/permissions.js";
import {
  hasPermission,
  type Role,
} from "../authorization/roles.js";

export function authorize(permission: Permission) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const role = request.user.role as Role;

    if (!hasPermission(role, permission)) {
      return reply.status(403).send({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
        },
      });
    }
  };
}