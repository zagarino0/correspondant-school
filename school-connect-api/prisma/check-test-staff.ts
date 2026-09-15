import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SCHOOL_ID = "cmtxl4wbh0000s2r4xq278ajs";

async function main() {
  const staff = await prisma.user.findMany({
    where: {
      role: "STAFF",
      schoolId: SCHOOL_ID,
    },
    orderBy: {
      email: "asc",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      schoolId: true,
      status: true,
      staffProfile: {
        select: {
          id: true,
          function: true,
          assignments: {
            where: {
              active: true,
            },
            select: {
              id: true,
              schoolId: true,
              startDate: true,
              endDate: true,
              active: true,
              school: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  console.log("");
  console.log("STAFF DE TEST");
  console.log("==========================================");
  console.log(`Nombre total : ${staff.length}`);
  console.log("");

  for (const user of staff) {
    console.log("------------------------------------------");
    console.log("User ID    :", user.id);
    console.log("Email      :", user.email);
    console.log("Nom        :", `${user.firstName} ${user.lastName}`);
    console.log("Role       :", user.role);
    console.log("Status     :", user.status);
    console.log("School ID  :", user.schoolId);

    console.log("");
    console.log("STAFF PROFILE");
    console.log("------------------------------------------");

    if (!user.staffProfile) {
      console.log("❌ StaffProfile absent");
      continue;
    }

    console.log("Staff ID   :", user.staffProfile.id);
    console.log("Function   :", user.staffProfile.function);

    console.log("");
    console.log("ASSIGNMENTS");
    console.log("------------------------------------------");

    if (user.staffProfile.assignments.length === 0) {
      console.log("❌ Aucune affectation active");
      continue;
    }

    for (const assignment of user.staffProfile.assignments) {
      console.log("Assignment :", assignment.id);
      console.log("School     :", assignment.school.name);
      console.log("School ID  :", assignment.schoolId);
      console.log("Active     :", assignment.active);
      console.log("Start      :", assignment.startDate.toISOString());
      console.log(
        "End        :",
        assignment.endDate
          ? assignment.endDate.toISOString()
          : "null"
      );
      console.log("");
    }
  }

  console.log("==========================================");
  console.log("");

  const expectedFunctions = [
    "ADMINISTRATION",
    "COMPTABILITE",
    "INFIRMIER",
    "SECRETARIAT",
    "SURVEILLANT",
  ];

  const foundFunctions = staff
    .map((user) => user.staffProfile?.function)
    .filter(Boolean);

  const missingFunctions = expectedFunctions.filter(
    (expectedFunction) =>
      !foundFunctions.includes(expectedFunction as never)
  );

  if (missingFunctions.length === 0) {
    console.log("✅ Les 5 fonctions Staff sont présentes.");
  } else {
    console.log("❌ Fonctions manquantes :");
    for (const missingFunction of missingFunctions) {
      console.log("   -", missingFunction);
    }
  }

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