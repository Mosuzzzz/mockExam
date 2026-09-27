import "./env";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { attempts, mockTests } from "./db/schema";

const connectionString = process.env.MIGRATION_DATABASE_URL?.trim() || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Set MIGRATION_DATABASE_URL or DATABASE_URL to run PostgreSQL migrations.");
}

const pool = new Pool({ connectionString, max: 1 });
try {
  const db = drizzle({ client: pool, schema: { attempts, mockTests } });
  const currentDir = dirname(fileURLToPath(import.meta.url));
  await migrate(db, { migrationsFolder: resolve(currentDir, "../drizzle-postgres") });
  console.info("PostgreSQL migrations applied.");
} finally {
  await pool.end();
}
