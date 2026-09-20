import { beforeAll, afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import { buildApp } from "../src/app/buildApp.js";

import { PrismaClient, UserRole, StaffFunction } from "@prisma/client";

const prisma = new PrismaClient();

const password = "MedicalTest123!";
const suffix = Date.now().toString();
const email = (name: string) => `medical-${name}-${suffix}@school-connect.test`;

const emails = {
  adminNoNurse: email("admin-no-nurse"),
  adminWithNurse: email("admin-with-nurse"),
  nurse: email("nurse"),
  parent: email("parent"),
  parentOther: email("parent-other"),
};

let app: Awaited<ReturnType<typeof buildApp>>;
let schoolAId: string;
let schoolBId: string;
let studentAUserId: string;
let studentBUserId: string;

async function login(userEmail: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: userEmail,
      password,
    },
  });

  expect(response.statusCode).toBe(200);

  const body = response.json() as { accessToken: string };
  expect(body.accessToken).toBeTruthy();

  return body.accessToken;
}

function auth(token: string) {
  return {
    authorization: `Bearer ${token}`,
  };
}

describe("medical permissions - real API integration", () => {
  beforeAll(async () => {
    app = await buildApp();

    const passwordHash = await bcrypt.hash(password, 4);

    const schoolA = await prisma.school.create({
      data: {
        code: `MED-A-${suffix}`,
        name: "Medical Test School A",
        status: "ACTIVE",
      },
    });

    const schoolB = await prisma.school.create({
      data: {
        code: `MED-B-${suffix}`,
        name: "Medical Test School B",
        status: "ACTIVE",
      },
    });

    schoolAId = schoolA.id;
    schoolBId = schoolB.id;

    const users = await prisma.user.createManyAndReturn({
      data: [
        {
          email: emails.adminNoNurse,
          passwordHash,
          firstName: "Admin",
          lastName: "NoNurse",
          role: UserRole.SCHOOL_ADMIN,
          status: "ACTIVE",
          schoolId: schoolAId,
        },
        {
          email: emails.adminWithNurse,
          passwordHash,
          firstName: "Admin",
          lastName: "WithNurse",
          role: UserRole.SCHOOL_ADMIN,
          status: "ACTIVE",
          schoolId: schoolBId,
        },
        {
          email: emails.nurse,
          passwordHash,
          firstName: "Test",
          lastName: "Nurse",
          role: UserRole.STAFF,
          status: "ACTIVE",
          schoolId: schoolBId,
        },
        {
          email: emails.parent,
          passwordHash,
          firstName: "Parent",
          lastName: "Owner",
          role: UserRole.PARENT,
          status: "ACTIVE",
          schoolId: schoolAId,
        },
        {
          email: emails.parentOther,
          passwordHash,
          firstName: "Parent",
          lastName: "Other",
          role: UserRole.PARENT,
          status: "ACTIVE",
          schoolId: schoolAId,
        },
      ],
    });

    const nurseUser = users.find((user) => user.email === emails.nurse);
    const parentUser = users.find((user) => user.email === emails.parent);

    if (!nurseUser || !parentUser) {
      throw new Error("Medical test users were not created.");
    }

    const staff = await prisma.staffProfile.create({
      data: {
        userId: nurseUser.id,
        function: StaffFunction.INFIRMIER,
      },
    });

    await prisma.staffAssignment.create({
      data: {
        staffId: staff.id,
        schoolId: schoolBId,
        startDate: new Date("2026-09-01T00:00:00.000Z"),
        active: true,
      },
    });

    const studentA = await prisma.user.create({
      data: {
        email: email("student-a"),
        passwordHash,
        firstName: "Student",
        lastName: "A",
        role: UserRole.STUDENT,
        status: "ACTIVE",
        schoolId: schoolAId,
      },
    });

    const studentB = await prisma.user.create({
      data: {
        email: email("student-b"),
        passwordHash,
        firstName: "Student",
        lastName: "B",
        role: UserRole.STUDENT,
        status: "ACTIVE",
        schoolId: schoolBId,
      },
    });

    studentAUserId = studentA.id;
    studentBUserId = studentB.id;

    const studentAProfile = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        userId: studentA.id,
        studentNumber: `MED-A-${suffix}`,
        firstName: "Student",
        lastName: "A",
        status: "ACTIVE",
      },
    });

    const studentBProfile = await prisma.student.create({
      data: {
        schoolId: schoolBId,
        userId: studentB.id,
        studentNumber: `MED-B-${suffix}`,
        firstName: "Student",
        lastName: "B",
        status: "ACTIVE",
      },
    });

    await prisma.parentStudent.create({
      data: {
        parentId: parentUser.id,
        studentId: studentAProfile.id,
        relationship: "Parent",
        isPrimary: true,
      },
    });

    await prisma.adultMedicalRecord.create({
      data: {
        userId: nurseUser.id,
        bloodGroup: "O+",
        notes: "Nurse test record",
      },
    });

    await prisma.studentMedicalRecord.create({
      data: {
        studentId: studentAProfile.id,
        bloodGroup: "A+",
        allergies: "Test allergy",
      },
    });

    await prisma.studentMedicalRecord.create({
      data: {
        studentId: studentBProfile.id,
        bloodGroup: "B+",
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            ...Object.values(emails),
            email("student-a"),
            email("student-b"),
          ],
        },
      },
    });

    await prisma.school.deleteMany({
      where: {
        id: {
          in: [schoolAId, schoolBId],
        },
      },
    });

    await app.close();
    await prisma.$disconnect();
  });

  it("1. School Admin without nurse gets FULL medical access", async () => {
    const token = await login(emails.adminNoNurse);

    const access = await app.inject({
      method: "GET",
      url: "/api/v1/medical/access",
      headers: auth(token),
    });

    expect(access.statusCode).toBe(200);
    expect(access.json()).toMatchObject({
      allowed: true,
      role: "SCHOOL_ADMIN",
      mode: "FULL",
    });

    const people = await app.inject({
      method: "GET",
      url: "/api/v1/medical/people",
      headers: auth(token),
    });

    expect(people.statusCode).toBe(200);

    const update = await app.inject({
      method: "PATCH",
      url: `/api/v1/medical/${studentAUserId}`,
      headers: auth(token),
      payload: {
        notes: "Updated by admin without nurse",
      },
    });

    expect(update.statusCode).toBe(200);

    const history = await app.inject({
      method: "GET",
      url: `/api/v1/medical-history/${studentAUserId}`,
      headers: auth(token),
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().history.length).toBeGreaterThan(0);
    expect(history.json().history[0]).toMatchObject({
      field: "notes",
      newValue: "Updated by admin without nurse",
      actor: { role: "SCHOOL_ADMIN" },
    });
  });

  it("2. School Admin with active nurse is denied", async () => {
    const token = await login(emails.adminWithNurse);

    const access = await app.inject({
      method: "GET",
      url: "/api/v1/medical/access",
      headers: auth(token),
    });

    expect(access.statusCode).toBe(200);
    expect(access.json()).toMatchObject({
      allowed: false,
      role: "SCHOOL_ADMIN",
      mode: "FULL",
    });

    for (const method of ["GET", "PATCH"] as const) {
      const response = await app.inject({
        method,
        url: `/api/v1/medical/${studentBUserId}`,
        headers: auth(token),
        ...(method === "PATCH"
          ? {
              payload: {
                notes: "Must be rejected",
              },
            }
          : {}),
      });

      expect(response.statusCode).toBe(403);
    }

    const people = await app.inject({
      method: "GET",
      url: "/api/v1/medical/people",
      headers: auth(token),
    });

    expect(people.statusCode).toBe(403);

    const history = await app.inject({
      method: "GET",
      url: `/api/v1/medical-history/${studentBUserId}`,
      headers: auth(token),
    });
    expect(history.statusCode).toBe(403);
  });

  it("3. Nurse gets FULL access only for the assigned school", async () => {
    const token = await login(emails.nurse);

    const access = await app.inject({
      method: "GET",
      url: "/api/v1/medical/access",
      headers: auth(token),
    });

    expect(access.statusCode).toBe(200);
    expect(access.json()).toMatchObject({
      allowed: true,
      role: "STAFF",
      mode: "FULL",
    });

    const ownSchool = await app.inject({
      method: "GET",
      url: `/api/v1/medical/${studentBUserId}`,
      headers: auth(token),
    });

    expect(ownSchool.statusCode).toBe(200);

    const otherSchool = await app.inject({
      method: "GET",
      url: `/api/v1/medical/${studentAUserId}`,
      headers: auth(token),
    });

    expect(otherSchool.statusCode).toBe(403);

    const history = await app.inject({
      method: "GET",
      url: `/api/v1/medical-history/${studentBUserId}`,
      headers: auth(token),
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().history.length).toBeGreaterThan(0);

    const otherHistory = await app.inject({
      method: "GET",
      url: `/api/v1/medical-history/${studentAUserId}`,
      headers: auth(token),
    });
    expect(otherHistory.statusCode).toBe(403);
  });

  it("4. Parent can read only their own child and cannot write", async () => {
    const token = await login(emails.parent);

    const children = await app.inject({
      method: "GET",
      url: "/api/v1/medical/my-children",
      headers: auth(token),
    });

    expect(children.statusCode).toBe(200);
    expect(children.json().children).toHaveLength(1);
    expect(children.json().children[0].userId).toBe(studentAUserId);

    const ownChild = await app.inject({
      method: "GET",
      url: `/api/v1/medical/${studentAUserId}`,
      headers: auth(token),
    });

    expect(ownChild.statusCode).toBe(200);
    expect(ownChild.json()).toMatchObject({
      access: {
        allowed: true,
        role: "PARENT",
        mode: "PARENT",
      },
    });

    const otherChild = await prisma.student.findFirstOrThrow({
      where: {
        userId: studentBUserId,
      },
      select: {
        userId: true,
      },
    });

    const forbiddenChild = await app.inject({
      method: "GET",
      url: `/api/v1/medical/${otherChild.userId}`,
      headers: auth(token),
    });

    expect(forbiddenChild.statusCode).toBe(403);

    const write = await app.inject({
      method: "PATCH",
      url: `/api/v1/medical/${studentAUserId}`,
      headers: auth(token),
      payload: {
        notes: "Parent must not write",
      },
    });

    expect(write.statusCode).toBe(403);

    const history = await app.inject({
      method: "GET",
      url: `/api/v1/medical-history/${studentAUserId}`,
      headers: auth(token),
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().history.length).toBeGreaterThan(0);

    const otherHistory = await app.inject({
      method: "GET",
      url: `/api/v1/medical-history/${studentBUserId}`,
      headers: auth(token),
    });
    expect(otherHistory.statusCode).toBe(403);
  });
});
