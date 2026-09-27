import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attempts, mockTests } from "./schema";
import { normalizeConnectionString } from "./connection-string";

const connectionString = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();

export const pool = new Pool({
  connectionString: connectionString ? normalizeConnectionString(connectionString) : undefined,
  max: Number(process.env.PG_POOL_MAX ?? (process.env.VERCEL ? "1" : "10")),
});
export const db = drizzle({ client: pool, schema: { attempts, mockTests } });

export function assertDatabaseConfigured() {
  if (!connectionString) {
    throw new Error("Set DATABASE_URL or POSTGRES_URL to configure the PostgreSQL connection.");
  }
}
