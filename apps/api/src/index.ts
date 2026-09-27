import "./env";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { staticPlugin } from "@elysia/static";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { assertDatabaseConfigured, db } from "./db/client";
import { app } from "./app";

assertDatabaseConfigured();
await migrate(db, { migrationsFolder: resolve(import.meta.dir, "../drizzle-postgres") });

const webAssets = resolve(import.meta.dir, "../../web/dist");
if (existsSync(webAssets)) {
  app.use(staticPlugin({ assets: webAssets, prefix: "", indexHTML: true }));
}

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
app.listen({ hostname: host, port });
console.info(`MockTest API listening on http://${host}:${port}`);
