import "./env";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { assertDatabaseConfigured, db } from "./db/client";

assertDatabaseConfigured();
await migrate(db, { migrationsFolder: resolve(import.meta.dir, "../drizzle-postgres") });
console.info("PostgreSQL migrations applied.");
