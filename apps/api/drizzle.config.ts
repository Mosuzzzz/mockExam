import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const apiDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(apiDir, "../../.env") });

const configuredPath = process.env.DATABASE_PATH ?? "data/mocktest.sqlite";
const databaseUrl = configuredPath.startsWith("/")
  ? configuredPath
  : resolve(apiDir, "../../", configuredPath);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: databaseUrl },
});
