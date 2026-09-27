import { spawnSync } from "node:child_process";

function runBun(args) {
  const result = spawnSync("bun", args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const shouldRunMigrations =
  process.env.VERCEL_ENV === "production" ||
  (process.env.VERCEL_ENV === "preview" && (process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL));

if (shouldRunMigrations) {
  if (!process.env.MIGRATION_DATABASE_URL) {
    throw new Error("Set MIGRATION_DATABASE_URL to Supabase's Session pooler connection string before deploying.");
  }
  runBun(["run", "db:migrate"]);
}

runBun(["run", "build"]);
runBun(["scripts/prepare-vercel.mjs"]);
