import { spawnSync } from "node:child_process";

function runBun(args) {
  const result = spawnSync("bun", args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const shouldRunMigrations = process.env.VERCEL_ENV === "production";

if (shouldRunMigrations) {
  const migrationDatabaseUrl =
    process.env.MIGRATION_DATABASE_URL?.trim() || process.env.POSTGRES_URL_NON_POOLING?.trim();
  if (!migrationDatabaseUrl) {
    throw new Error("Set MIGRATION_DATABASE_URL or POSTGRES_URL_NON_POOLING before deploying.");
  }
  runBun(["run", "db:migrate"]);
}

runBun(["run", "build"]);
runBun(["scripts/prepare-vercel.mjs"]);
