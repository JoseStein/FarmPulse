import "dotenv/config";
import {defineConfig} from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npm run db:seed:development",
  },
  engine: "classic",
  datasource: {
    // Client generation does not need a live database. Runtime migrations and
    // queries receive the real Railway DATABASE_URL from the service environment.
    url: process.env.DATABASE_URL ?? "postgresql://build:build@localhost:5432/build",
  },
});
