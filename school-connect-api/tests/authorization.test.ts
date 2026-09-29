import { describe, expect, it } from "vitest";

import {
  canAccessResource,
  type ResourceContext,
} from "../src/authorization/resource-access.js";

import {
  hasPermission,
  type Role,
} from "../src/authorization/roles.js";

import { hasStaffPermission } from "../src/authorization/staff-permissions.js";
import { StaffFunction } from "@prisma/client";

describe("ABAC - Resource Access", () => {
  it("autorise un parent à accéder aux données de son enfant", () => {
    const context: ResourceContext = {
      scope: "CHILD",
      userId: "parent-001",
      userRole: "PARENT",
      userSchoolId: "school-001",
      relatedUserIds: ["parent-001"],
    };

    expect(canAccessResource(context)).toBe(true);
  });

  it("refuse un parent qui n'est pas lié à la ressource", () => {
    const context: ResourceContext = {
      scope: "CHILD",
      userId: "parent-001",
      userRole: "PARENT",
      userSchoolId: "school-001",
      relatedUserIds: ["parent-002"],
    };

    expect(canAccessResource(context)).toBe(false);
  });

  it("autorise un utilisateur à accéder à sa propre ressource", () => {
    const context: ResourceContext = {
      scope: "OWN",
      userId: "student-001",
      userRole: "STUDENT",
      userSchoolId: "school-001",
      resourceUserId: "student-001",
    };

    expect(canAccessResource(context)).toBe(true);
  });

  it("refuse l'accès à la ressource d'un autre utilisateur", () => {
    const context: ResourceContext = {
      scope: "OWN",
      userId: "student-001",
      userRole: "STUDENT",
      userSchoolId: "school-001",
      resourceUserId: "student-002",
    };

    expect(canAccessResource(context)).toBe(false);
  });

  it("autorise un school admin dans sa propre école", () => {
    const context: ResourceContext = {
      scope: "SCHOOL",
      userId: "admin-001",
      userRole: "SCHOOL_ADMIN",
      userSchoolId: "school-001",
      resourceSchoolId: "school-001",
    };

    expect(canAccessResource(context)).toBe(true);
  });

  it("refuse un school admin d'une autre école", () => {
    const context: ResourceContext = {
      scope: "SCHOOL",
      userId: "admin-001",
      userRole: "SCHOOL_ADMIN",
      userSchoolId: "school-001",
      resourceSchoolId: "school-002",
    };

    expect(canAccessResource(context)).toBe(false);
  });

  it("autorise le super admin avec le scope global", () => {
    const context: ResourceContext = {
      scope: "GLOBAL",
      userId: "superadmin-001",
      userRole: "SUPER_ADMIN",
      userSchoolId: null,
    };

    expect(canAccessResource(context)).toBe(true);
  });
});

describe("Student RBAC", () => {
  const studentRole: Role = "STUDENT";

  it("autorise le Student à lire ses notes", () => {
    expect(
      hasPermission(studentRole, "grade.read")
    ).toBe(true);
  });

  it("autorise le Student à lire ses devoirs", () => {
    expect(
      hasPermission(studentRole, "assignment.read")
    ).toBe(true);
  });

  it("autorise le Student à lire son emploi du temps", () => {
    expect(
      hasPermission(studentRole, "schedule.read")
    ).toBe(true);
  });

  it("autorise le Student à lire ses documents", () => {
    expect(
      hasPermission(studentRole, "document.read")
    ).toBe(true);
  });

  it("interdit au Student l'accès aux présences", () => {
    expect(
      hasPermission(studentRole, "attendance.read")
    ).toBe(false);
  });

  it("interdit au Student l'accès aux autorisations", () => {
    expect(
      hasPermission(studentRole, "authorization.read")
    ).toBe(false);
  });

  it("interdit au Student l'accès aux paiements", () => {
    expect(
      hasPermission(studentRole, "payment.read")
    ).toBe(false);
  });
});

describe("Surveillant RBAC", () => {
  const surveillant = StaffFunction.SURVEILLANT;

  it("autorise la consultation des élèves", () => {
    expect(hasStaffPermission(surveillant, "student.read")).toBe(true);
  });

  it("autorise la gestion opérationnelle des présences", () => {
    expect(hasStaffPermission(surveillant, "attendance.read")).toBe(true);
    expect(hasStaffPermission(surveillant, "attendance.create")).toBe(true);
    expect(hasStaffPermission(surveillant, "attendance.update")).toBe(true);
    expect(hasStaffPermission(surveillant, "attendance.delete")).toBe(false);
  });

  it("autorise les événements de retard et d'absence sans suppression", () => {
    expect(hasStaffPermission(surveillant, "attendance-event.read")).toBe(true);
    expect(hasStaffPermission(surveillant, "attendance-event.create")).toBe(true);
  });

  it("autorise les convocations sans suppression", () => {
    expect(hasStaffPermission(surveillant, "parent-summons.read")).toBe(true);
    expect(hasStaffPermission(surveillant, "parent-summons.create")).toBe(true);
    expect(hasStaffPermission(surveillant, "parent-summons.update")).toBe(false);
  });

  it("autorise la messagerie et les annonces", () => {
    expect(hasStaffPermission(surveillant, "message.read")).toBe(true);
    expect(hasStaffPermission(surveillant, "message.send")).toBe(true);
    expect(hasStaffPermission(surveillant, "announcement.read")).toBe(true);
    expect(hasStaffPermission(surveillant, "announcement.create")).toBe(true);
    expect(hasStaffPermission(surveillant, "announcement.delete")).toBe(false);
  });

  it("refuse les fonctions pédagogiques, financières et administratives", () => {
    expect(hasStaffPermission(surveillant, "grade.read")).toBe(false);
    expect(hasStaffPermission(surveillant, "assignment.create")).toBe(false);
    expect(hasStaffPermission(surveillant, "schedule.create")).toBe(false);
    expect(hasStaffPermission(surveillant, "payment.read")).toBe(false);
    expect(hasStaffPermission(surveillant, "user.create")).toBe(false);
  });
});
