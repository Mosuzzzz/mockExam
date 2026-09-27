import "./env";
import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { answerMapSchema, mockTestSchema } from "@mocktest/shared";
import { assertDatabaseConfigured } from "./db/client";

type LegacyTestRow = {
  id: string;
  clerk_user_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
  test_json: string;
  created_at: number;
  updated_at: number;
};

type LegacyAttemptRow = {
  id: string;
  clerk_user_id: string;
  mock_test_id: string;
  status: "in_progress" | "completed";
  answers_json: string;
  answer_revision: number;
  score: number | null;
  total_questions: number;
  percentage: number | null;
  completion_reason: "manual" | "timeout" | null;
  started_at: number;
  expires_at: number;
  completed_at: number | null;
};

function readJson(value: string, description: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`The SQLite ${description} contains invalid JSON. No rows were imported.`);
  }
}

function asDate(value: number, description: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`The SQLite ${description} has an invalid timestamp. No rows were imported.`);
  return date;
}

assertDatabaseConfigured();

const currentDir = dirname(fileURLToPath(import.meta.url));
const sqlitePath = resolve(currentDir, "../../../data/mocktest.sqlite");
if (!existsSync(sqlitePath)) {
  throw new Error(`No legacy SQLite database was found at ${sqlitePath}.`);
}

const source = new Database(sqlitePath, { readonly: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const tests = source.query("SELECT * FROM mock_tests ORDER BY created_at, id").all() as LegacyTestRow[];
  const attempts = source.query("SELECT * FROM attempts ORDER BY started_at, id").all() as LegacyAttemptRow[];

  const validatedTests = tests.map((row) => {
    const testJson = mockTestSchema.parse(readJson(row.test_json, `test ${row.id}`));
    return { row, testJson };
  });
  const validatedAttempts = attempts.map((row) => {
    const answersJson = answerMapSchema.parse(readJson(row.answers_json, `answers for attempt ${row.id}`));
    return { row, answersJson };
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const [testCount, attemptCount] = await Promise.all([
      client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM mock_tests"),
      client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM attempts"),
    ]);
    if (Number(testCount.rows[0]?.count) > 0 || Number(attemptCount.rows[0]?.count) > 0) {
      throw new Error("PostgreSQL already contains tests or attempts. Import stopped without changing either database.");
    }

    for (const { row, testJson } of validatedTests) {
      await client.query(
        `INSERT INTO mock_tests
         (id, clerk_user_id, title, description, duration_minutes, question_count, test_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
        [row.id, row.clerk_user_id, row.title, row.description, row.duration_minutes, row.question_count, JSON.stringify(testJson), asDate(row.created_at, `test ${row.id}`), asDate(row.updated_at, `test ${row.id}`)],
      );
    }

    for (const { row, answersJson } of validatedAttempts) {
      await client.query(
        `INSERT INTO attempts
         (id, clerk_user_id, mock_test_id, status, answers_json, answer_revision, score, total_questions,
          percentage, completion_reason, started_at, expires_at, completed_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [row.id, row.clerk_user_id, row.mock_test_id, row.status, JSON.stringify(answersJson), row.answer_revision, row.score, row.total_questions, row.percentage, row.completion_reason, asDate(row.started_at, `attempt ${row.id}`), asDate(row.expires_at, `attempt ${row.id}`), row.completed_at === null ? null : asDate(row.completed_at, `attempt ${row.id}`)],
      );
    }

    await client.query("COMMIT");
    console.info(`Imported ${validatedTests.length} tests and ${validatedAttempts.length} attempts. The SQLite database was left unchanged.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} finally {
  source.close();
  await pool.end();
}
