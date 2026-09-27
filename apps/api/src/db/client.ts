import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attempts, mockTests } from "./schema";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema: { attempts, mockTests } });

export function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Start the PostgreSQL Docker service and configure the root .env file.");
  }
}
