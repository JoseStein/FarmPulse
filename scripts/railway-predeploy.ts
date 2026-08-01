import { spawnSync } from "node:child_process";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  run("npx", ["prisma", "migrate", "deploy"]);

  console.log("Applying idempotent production structure (no demo operations)." );
  run("npm", ["run", "db:initialize:production"]);
}

main().catch((error) => { console.error(error); process.exit(1); });
