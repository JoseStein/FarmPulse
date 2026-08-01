import { spawnSync } from "node:child_process";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "migrate", "deploy"]);

const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const operatorPassword = process.env.SEED_OPERATOR_PASSWORD;

if (adminPassword || operatorPassword) {
  if (!adminPassword || !operatorPassword) {
    console.error("Set both SEED_ADMIN_PASSWORD and SEED_OPERATOR_PASSWORD, or remove both.");
    process.exit(1);
  }
  console.log("Seed password variables detected; creating or updating the initial FarmPulse accounts.");
  run("npm", ["run", "db:seed"]);
} else {
  console.log("No seed password variables detected; skipping pilot seed.");
}
