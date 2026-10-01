import type { Permission } from "./permissions.js";
import { rolePermissions, type Role } from "./roles.js";
import { getStaffPermissions } from "./staff-permissions.js";
import type { StaffFunction } from "@prisma/client";

export function getUserPermissions(
  role: Role,
  staffFunction?: StaffFunction | null,
): readonly Permission[] {
  if (role === "STAFF") {
    return staffFunction ? getStaffPermissions(staffFunction) : [];
  }

  return rolePermissions[role];
}
