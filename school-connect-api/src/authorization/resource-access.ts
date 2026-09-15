import type { Role } from "./roles.js";
import type { ResourceScope } from "./scopes.js";
import { hasResourceScope } from "./scopes.js";

export interface ResourceContext {
  scope: ResourceScope;

  userId: string;
  userRole: Role;
  userSchoolId: string | null;

  resourceUserId?: string | null;
  resourceSchoolId?: string | null;

  relatedUserIds?: string[];
}

export function canAccessResource(
  context: ResourceContext
): boolean {
  const {
    scope,
    userId,
    userSchoolId,
    resourceUserId,
    resourceSchoolId,
    relatedUserIds = [],
  } = context;

  if (!hasResourceScope(context.userRole, scope)) {
    return false;
  }

  switch (scope) {
    case "GLOBAL":
      return true;

    case "SCHOOL":
      return (
        userSchoolId !== null &&
        resourceSchoolId === userSchoolId
      );

    case "OWN":
      return (
        resourceUserId !== null &&
        resourceUserId === userId
      );

    case "CHILD":
      return relatedUserIds.includes(userId);

    case "ASSIGNED":
      return (
        resourceUserId !== null &&
        resourceUserId === userId
      );

    default:
      return false;
  }
}