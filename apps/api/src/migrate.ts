import "./env";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./db/client";

await migrate(db, { migrationsFolder: resolve(import.meta.dir, "../drizzle") });
console.info("SQLite migrations applied.");
