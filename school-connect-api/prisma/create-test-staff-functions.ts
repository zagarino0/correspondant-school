import {
  PrismaClient,
  StaffFunction,
  UserRole,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SCHOOL_ID = "cmtxl4wbh0000s2r4xq278ajs";
const PASSWORD = "Password123!";

const staffUsers = [
  {
    email: "administration@school-connect.local",
    firstName: "Demo",
    lastName: "Administration",
    function: StaffFunction.ADMINISTRATION,
  },
  {
    email: "secretariat@school-connect.local",
    firstName: "Demo",
    lastName: "Secretariat",
    function: StaffFunction.SECRETARIAT,
  },
  {
    email: "comptabilite@school-connect.local",
    firstName: "Demo",
    lastName: "Comptabilite",
    function: StaffFunction.COMPTABILITE,
  },
  {
    email: "infirmier@school-connect.local",
    firstName: "Demo",
    lastName: "Infirmier",
    function: StaffFunction.INFIRMIER,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  console.log("");
  console.log("Création / vérification des Staff de test");
  console.log("==========================================");
  console.log("");

  for (const staffData of staffUsers) {
    const user = await prisma.user.upsert({
      where: {
        email: staffData.email,
      },
      update: {
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        role: UserRole.STAFF,
        status: UserStatus.ACTIVE,
        schoolId: SCHOOL_ID,
        passwordHash,
      },
      create: {
        email: staffData.email,
        passwordHash,
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        role: UserRole.STAFF,
        status: UserStatus.ACTIVE,
        schoolId: SCHOOL_ID,
      },
    });

    const staffProfile = await prisma.staffProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        function: staffData.function,
      },
      create: {
        userId: user.id,
        function: staffData.function,
      },
    });

    const existingAssignment =
      await prisma.staffAssignment.findFirst({
        where: {
          staffId: staffProfile.id,
          schoolId: SCHOOL_ID,
        },
      });

    const assignment =
      existingAssignment ??
      (await prisma.staffAssignment.create({
        data: {
          staffId: staffProfile.id,
          schoolId: SCHOOL_ID,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          active: true,
        },
      }));

    console.log("------------------------------------------");
    console.log("User ID       :", user.id);
    console.log("Email         :", user.email);
    console.log("Role          :", user.role);
    console.log("School ID     :", user.schoolId);
    console.log("Staff ID      :", staffProfile.id);
    console.log("Function      :", staffProfile.function);
    console.log("Assignment ID :", assignment.id);
    console.log("Active        :", assignment.active);
  }

  console.log("------------------------------------------");
  console.log("");
  console.log("Tous les Staff de test sont prêts.");
  console.log("École         : School 1");
  console.log("Mot de passe  : Password123!");
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });