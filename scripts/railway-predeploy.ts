import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  run("npx", ["prisma", "migrate", "deploy"]);

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const operatorPassword = process.env.SEED_OPERATOR_PASSWORD;

  if (adminPassword || operatorPassword) {
    if (!adminPassword) {
      console.error("SEED_OPERATOR_PASSWORD cannot be used without SEED_ADMIN_PASSWORD.");
      process.exit(1);
    }
    const prisma = new PrismaClient();
    const activeAdministrators = await prisma.farmMembership.count({ where: { role: "ADMIN", user: { active: true } } });
    await prisma.$disconnect();
    if (activeAdministrators > 0) {
      console.log("FarmPulse is already initialized; skipping pilot seed.");
      return;
    }
    console.log("No active administrator found; creating the initial FarmPulse account and pilot data.");
    run("npm", ["run", "db:seed"]);
  } else {
    console.log("No seed password variables detected; skipping pilot seed.");
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
