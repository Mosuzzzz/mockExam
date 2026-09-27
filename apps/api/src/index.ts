import "./env";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { assertDatabaseConfigured, db } from "./db/client";
import { app } from "./app";

assertDatabaseConfigured();
const currentDir = dirname(fileURLToPath(import.meta.url));
await migrate(db, { migrationsFolder: resolve(currentDir, "../drizzle-postgres") });

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
app.listen({ hostname: host, port });
console.info(`MockTest API listening on http://${host}:${port}`);
