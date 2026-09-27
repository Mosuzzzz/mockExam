import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const apiDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(apiDir, "../../.env") });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle-postgres",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
