import type { Role } from "./roles.js";

export type ResourceScope =
  | "GLOBAL"
  | "SCHOOL"
  | "OWN"
  | "CHILD"
  | "ASSIGNED";

export const roleResourceScopes: Record<
  Role,
  readonly ResourceScope[]
> = {
  SUPER_ADMIN: ["GLOBAL"],

  SCHOOL_ADMIN: ["SCHOOL"],

  TEACHER: ["ASSIGNED"],

  PARENT: ["CHILD", "OWN"],

  STUDENT: ["OWN"],

  STAFF: ["SCHOOL"],
};

export function hasResourceScope(
  role: Role,
  scope: ResourceScope
): boolean {
  return roleResourceScopes[role].includes(scope);
}