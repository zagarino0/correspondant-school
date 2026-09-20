import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

const expectedAccounts = [
  "superadmin@school-connect.local",
  "admin@school-connect.local",
  "teacher@school-connect.local",
  "parent@school-connect.local",
  "parent2@school-connect.local",
  "parent3@school-connect.local",
  "parent4@school-connect.local",
  "staff@school-connect.local",
];

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: { in: expectedAccounts },
    },
    select: {
      email: true,
      status: true,
      passwordHash: true,
    },
  });

  const byEmail = new Map(users.map((user) => [user.email, user]));

  const missing = expectedAccounts.filter((email) => !byEmail.has(email));
  const inactive = users.filter((user) => user.status !== "ACTIVE").map((user) => user.email);
  const invalidPassword = [];

  for (const email of expectedAccounts) {
    const user = byEmail.get(email);
    if (user && !(await bcrypt.compare(PASSWORD, user.passwordHash))) {
      invalidPassword.push(email);
    }
  }

  if (missing.length || inactive.length || invalidPassword.length) {
    console.error("Seed verification failed.");
    if (missing.length) console.error("Missing accounts:", missing.join(", "));
    if (inactive.length) console.error("Inactive accounts:", inactive.join(", "));
    if (invalidPassword.length) console.error("Password mismatch:", invalidPassword.join(", "));
    process.exit(1);
  }

  console.log("Seed verification passed.");
  console.log(`Verified ${expectedAccounts.length} development accounts with ACTIVE status and the expected development password.`);
}

main()
  .catch((error) => {
    console.error("Seed verification failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
