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
      role: true,
    },
  });

  if (!targetUser) {
    return false;
  }

  // SCHOOL_ADMIN : uniquement sa propre école
  if (requesterRole === "SCHOOL_ADMIN") {
    return targetUser.schoolId === requesterSchoolId;
  }

  // Les membres du personnel disposant de user.read peuvent
  // consulter l'annuaire des comptes de personnel de leur école.
  // Le middleware authorize() garantit que seuls les rôles/fonctions
  // disposant réellement de user.read atteignent ce point.
  if (requesterRole === "TEACHER" || requesterRole === "STAFF") {
    return (
      targetUser.schoolId === requesterSchoolId &&
      (targetUser.role === "SCHOOL_ADMIN" ||
        targetUser.role === "TEACHER" ||
        targetUser.role === "STAFF")
    );
  }

  return false;
}