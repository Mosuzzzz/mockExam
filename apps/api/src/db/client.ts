import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attempts, mockTests } from "./schema";

const connectionString = process.env.DATABASE_URL?.trim();

export const pool = new Pool({
  connectionString: connectionString || undefined,
  max: Number(process.env.PG_POOL_MAX ?? "10"),
});
export const db = drizzle({ client: pool, schema: { attempts, mockTests } });

export function assertDatabaseConfigured() {
  if (!connectionString) {
    throw new Error("Set DATABASE_URL to configure the local PostgreSQL connection.");
  }
}
