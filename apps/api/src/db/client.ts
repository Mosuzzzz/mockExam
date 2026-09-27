import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { attempts, mockTests } from "./schema";

const rootDir = resolve(import.meta.dir, "../../..");
export const databasePath = resolve(rootDir, process.env.DATABASE_PATH ?? "data/mocktest.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

export const sqlite = new Database(databasePath, { create: true });
sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");

export const db = drizzle({ client: sqlite, schema: { attempts, mockTests } });
