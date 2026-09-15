import type { FastifyReply, FastifyRequest } from "fastify";

import type { Permission } from "../authorization/permissions.js";
import { hasPermission } from "../authorization/roles.js";
import { hasStaffPermission } from "../authorization/staff-permissions.js";
import type { Role } from "../authorization/roles.js";
export type ResourceAccessCheck = (
  request: FastifyRequest
) => Promise<boolean>;

export function authorizeResource(
  permission: Permission,
  checkResourceAccess: ResourceAccessCheck
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const role = request.user.role as Role;

    /*
     * RBAC classique pour tous les rôles sauf STAFF.
     */
    if (role !== "STAFF") {
      if (!hasPermission(role, permission)) {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to perform this action.",
          },
        });
      }
    }

    /*
     * STAFF :
     * la permission dépend de la fonction métier
     * définie dans StaffProfile.
     */
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
        return reply.status(403).send({
          error: {
            code: "STAFF_PROFILE_NOT_FOUND",
            message: "Staff profile not found.",
          },
        });
      }

      if (!hasStaffPermission(staffProfile.function, permission)) {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to perform this action.",
          },
        });
      }
    }

    /*
     * Permission validée.
     * On passe maintenant au contrôle ABAC
     * de la ressource.
     */
    const hasAccess = await checkResourceAccess(request);

    if (!hasAccess) {
      return reply.status(403).send({
        error: {
          code: "RESOURCE_ACCESS_DENIED",
          message: "You do not have access to this resource.",
        },
      });
    }
  };
}