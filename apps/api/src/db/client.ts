import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attempts, mockTests } from "./schema";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? (process.env.VERCEL ? "1" : "10")),
});
export const db = drizzle({ client: pool, schema: { attempts, mockTests } });

export function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Configure a PostgreSQL connection string in the environment.");
  }
}
