import type { AuthUser } from "../../types/auth";

export function hasPermission(user: AuthUser | null, permission: string) {
  return user?.permissions?.includes(permission) ?? false;
}
