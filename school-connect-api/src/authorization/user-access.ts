import type { PrismaClient } from "@prisma/client";

import type { Role } from "./roles.js";

interface UserResourceContext {
  prisma: PrismaClient;
  requesterId: string;
  requesterRole: Role;
  requesterSchoolId: string | null;
  targetUserId: string;
}

export async function canAccessUser(
  context: UserResourceContext
): Promise<boolean> {
  const {
    prisma,
    requesterId,
    requesterRole,
    requesterSchoolId,
    targetUserId,
  } = context;

  // SUPER_ADMIN : accès global
  if (requesterRole === "SUPER_ADMIN") {
    return true;
  }

  // Les autres utilisateurs doivent appartenir à une école.
  if (!requesterSchoolId) {
    return false;
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: targetUserId,
    },
    select: {
      id: true,
      schoolId: true,
    },
  });

  if (!targetUser) {
    return false;
  }

  // SCHOOL_ADMIN : uniquement sa propre école
  if (requesterRole === "SCHOOL_ADMIN") {
    return targetUser.schoolId === requesterSchoolId;
  }

  // Pour les autres rôles, un utilisateur ne peut
  // accéder qu'à son propre compte via cet endpoint.
  if (
    requesterRole === "TEACHER" ||
    requesterRole === "STAFF"
  ) {
    return (
      targetUser.id === requesterId &&
      targetUser.schoolId === requesterSchoolId
    );
  }

  return false;
}