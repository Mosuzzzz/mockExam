import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { PoolClient } from "pg";
import {
  answerMapSchema,
  formatValidationIssues,
  mockTestSchema,
  type AnswerMap,
  type MockTest,
} from "@mocktest/shared";
import { attempts, mockTests } from "../db/schema";
import { db, pool } from "../db/client";
import { ApiError, notFound } from "../errors";

type AttemptRow = typeof attempts.$inferSelect;
type TestRow = typeof mockTests.$inferSelect;
type RawAttempt = {
  id: string;
  clerk_user_id: string;
  mock_test_id: string;
  status: "in_progress" | "completed";
  answers_json: unknown;
  answer_revision: number;
  score: number | null;
  total_questions: number;
  percentage: number | null;
  completion_reason: "manual" | "timeout" | null;
  started_at: Date;
  expires_at: Date;
  completed_at: Date | null;
};

function parseTest(value: unknown): MockTest {
  const parsed = mockTestSchema.safeParse(value);
  if (!parsed.success) throw new ApiError(500, "CORRUPT_TEST", "A saved test could not be read.");
  return parsed.data;
}

function toExamTest(test: MockTest) {
  return {
    version: test.version,
    title: test.title,
    description: test.description,
    duration_minutes: test.duration_minutes,
    questions: test.questions.map(({ answer: _answer, explanation: _explanation, ...question }) => question),
  };
}

function parseAnswers(value: unknown): AnswerMap {
  const parsed = answerMapSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function scoreTest(test: MockTest, answers: AnswerMap) {
  const questionIds = new Set(test.questions.map((question) => question.id));
  const invalidId = Object.keys(answers).find((id) => !questionIds.has(id));
  if (invalidId) throw new ApiError(422, "INVALID_ANSWER", "An answer refers to a question outside this test.");
  const score = test.questions.reduce(
    (total, question) => total + Number(answers[question.id] === question.answer),
    0,
  );
  return { score, total: test.questions.length, percentage: Math.round((score / test.questions.length) * 100) };
}

function toRawAttempt(row: AttemptRow): RawAttempt {
  return {
    id: row.id,
    clerk_user_id: row.clerkUserId,
    mock_test_id: row.mockTestId,
    status: row.status,
    answers_json: row.answersJson,
    answer_revision: row.answerRevision,
    score: row.score,
    total_questions: row.totalQuestions,
    percentage: row.percentage,
    completion_reason: row.completionReason,
    started_at: row.startedAt,
    expires_at: row.expiresAt,
    completed_at: row.completedAt,
  };
}

async function gradeAndFinalizeWithClient(
  client: PoolClient,
  userId: string,
  attemptId: string,
  reason: "manual" | "timeout",
): Promise<RawAttempt> {
  const attemptResult = await client.query<RawAttempt>(
    "SELECT * FROM attempts WHERE id = $1 AND clerk_user_id = $2 FOR UPDATE",
    [attemptId, userId],
  );
  const row = attemptResult.rows[0];
  if (!row) throw notFound();
  if (row.status === "completed") return row;

  const testResult = await client.query<{ test_json: unknown }>(
    "SELECT test_json FROM mock_tests WHERE id = $1 AND clerk_user_id = $2",
    [row.mock_test_id, userId],
  );
  const testRow = testResult.rows[0];
  if (!testRow) throw notFound();
  const test = parseTest(testRow.test_json);
  const answers = parseAnswers(row.answers_json);
  const result = scoreTest(test, answers);
  const completedAt = new Date();
  const actualReason = reason === "timeout" || completedAt >= row.expires_at ? "timeout" : "manual";

  const updatedResult = await client.query<RawAttempt>(
    `UPDATE attempts
     SET status = 'completed', score = $1, total_questions = $2, percentage = $3,
         completion_reason = $4, completed_at = $5
     WHERE id = $6 AND clerk_user_id = $7 AND status = 'in_progress'
     RETURNING *`,
    [result.score, result.total, result.percentage, actualReason, completedAt, attemptId, userId],
  );
  const updated = updatedResult.rows[0];
  if (!updated) {
    throw new ApiError(409, "SUBMISSION_CONFLICT", "The answers changed while the exam was being submitted. Please submit again.");
  }
  return updated;
}

async function gradeAndFinalize(userId: string, attemptId: string, reason: "manual" | "timeout") {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await gradeAndFinalizeWithClient(client, userId, attemptId, reason);
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function rawToView(row: RawAttempt, testRow: TestRow, serverNow = Date.now()) {
  const test = parseTest(testRow.testJson);
  const answers = parseAnswers(row.answers_json);
  const visibleTest = row.status === "completed" ? test : toExamTest(test);
  return {
    id: row.id,
    mockTestId: row.mock_test_id,
    status: row.status,
    answers,
    answerRevision: row.answer_revision,
    startedAt: row.started_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    completionReason: row.completion_reason,
    score: row.score,
    totalQuestions: row.total_questions,
    percentage: row.percentage,
    correctCount: row.score,
    incorrectCount: row.score === null ? null : row.total_questions - row.score,
    unansweredCount: row.status === "completed" ? test.questions.filter((question) => answers[question.id] === undefined).length : null,
    serverNow: new Date(serverNow).toISOString(),
    test: visibleTest,
  };
}

async function getTestRow(userId: string, testId: string) {
  const [row] = await db
    .select()
    .from(mockTests)
    .where(and(eq(mockTests.id, testId), eq(mockTests.clerkUserId, userId)))
    .limit(1);
  if (!row) throw notFound();
  return row;
}

async function getAttemptRow(userId: string, attemptId: string) {
  const [row] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.clerkUserId, userId)))
    .limit(1);
  if (!row) throw notFound();
  return row;
}

export async function listTests(userId: string) {
  const [tests, history] = await Promise.all([
    db.select().from(mockTests).where(eq(mockTests.clerkUserId, userId)).orderBy(desc(mockTests.updatedAt)),
    db.select().from(attempts).where(eq(attempts.clerkUserId, userId)).orderBy(desc(attempts.completedAt)),
  ]);
  const latest = new Map<string, AttemptRow>();
  for (const attempt of history) {
    if (attempt.status === "completed" && !latest.has(attempt.mockTestId)) latest.set(attempt.mockTestId, attempt);
  }
  return tests.map((test) => {
    const previous = latest.get(test.id);
    return {
      id: test.id,
      title: test.title,
      description: test.description,
      durationMinutes: test.durationMinutes,
      questionCount: test.questionCount,
      createdAt: test.createdAt.toISOString(),
      updatedAt: test.updatedAt.toISOString(),
      attemptCount: history.filter((attempt) => attempt.mockTestId === test.id && attempt.status === "completed").length,
      latestAttempt: previous
        ? { score: previous.score, totalQuestions: previous.totalQuestions, percentage: previous.percentage, completedAt: previous.completedAt?.toISOString() ?? null }
        : null,
    };
  });
}

export async function createTest(userId: string, input: unknown) {
  const parsed = mockTestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION_ERROR", "Fix the marked fields, then try saving again.", formatValidationIssues(parsed.error.issues));
  }
  const test = parsed.data;
  const now = new Date();
  const id = crypto.randomUUID();
  await db.insert(mockTests).values({
    id,
    clerkUserId: userId,
    title: test.title,
    description: test.description ?? null,
    durationMinutes: test.duration_minutes,
    questionCount: test.questions.length,
    testJson: test,
    createdAt: now,
    updatedAt: now,
  });
  return { id, title: test.title, durationMinutes: test.duration_minutes, questionCount: test.questions.length };
}

export async function readTest(userId: string, testId: string) {
  const row = await getTestRow(userId, testId);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationMinutes: row.durationMinutes,
    questionCount: row.questionCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    test: toExamTest(parseTest(row.testJson)),
  };
}

export async function deleteTest(userId: string, testId: string) {
  const deleted = await db
    .delete(mockTests)
    .where(and(eq(mockTests.id, testId), eq(mockTests.clerkUserId, userId)))
    .returning({ id: mockTests.id });
  if (!deleted.length) throw notFound();
  return { deleted: true };
}

async function startOrResume(userId: string, testId: string): Promise<RawAttempt> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const testResult = await client.query<{ test_json: unknown; duration_minutes: number; question_count: number }>(
      "SELECT test_json, duration_minutes, question_count FROM mock_tests WHERE id = $1 AND clerk_user_id = $2 FOR KEY SHARE",
      [testId, userId],
    );
    const testRow = testResult.rows[0];
    if (!testRow) throw notFound();

    const activeResult = await client.query<RawAttempt>(
      "SELECT * FROM attempts WHERE mock_test_id = $1 AND clerk_user_id = $2 AND status = 'in_progress' LIMIT 1 FOR UPDATE",
      [testId, userId],
    );
    const active = activeResult.rows[0];
    const now = new Date();
    if (active && active.expires_at > now) {
      await client.query("COMMIT");
      return active;
    }
    if (active) await gradeAndFinalizeWithClient(client, userId, active.id, "timeout");

    const test = parseTest(testRow.test_json);
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + testRow.duration_minutes * 60_000);
    const attemptId = crypto.randomUUID();
    const inserted = await client.query<RawAttempt>(
      `INSERT INTO attempts
       (id, clerk_user_id, mock_test_id, status, answers_json, answer_revision, total_questions, started_at, expires_at)
       VALUES ($1, $2, $3, 'in_progress', '{}'::jsonb, 0, $4, $5, $6)
       RETURNING *`,
      [attemptId, userId, testId, test.questions.length, startedAt, expiresAt],
    );
    const row = inserted.rows[0];
    if (!row) throw new Error("PostgreSQL did not return the created attempt.");
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function isActiveAttemptConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: string; constraint?: string };
  return pgError.code === "23505" && pgError.constraint === "attempts_one_active_per_user_test";
}

export async function startAttempt(userId: string, testId: string) {
  let attempt: RawAttempt;
  try {
    attempt = await startOrResume(userId, testId);
  } catch (error) {
    if (!isActiveAttemptConflict(error)) throw error;
    const [existing] = await db
      .select()
      .from(attempts)
      .where(and(eq(attempts.mockTestId, testId), eq(attempts.clerkUserId, userId), eq(attempts.status, "in_progress")))
      .limit(1);
    if (!existing) throw error;
    attempt = toRawAttempt(existing);
  }
  const row = await getTestRow(userId, testId);
  if (attempt.status === "in_progress" && attempt.expires_at <= new Date()) {
    attempt = await gradeAndFinalize(userId, attempt.id, "timeout");
  }
  return rawToView(attempt, row);
}

export async function readAttempt(userId: string, attemptId: string) {
  let attempt = toRawAttempt(await getAttemptRow(userId, attemptId));
  if (attempt.status === "in_progress" && attempt.expires_at <= new Date()) {
    attempt = await gradeAndFinalize(userId, attemptId, "timeout");
  }
  const test = await getTestRow(userId, attempt.mock_test_id);
  return rawToView(attempt, test);
}

export async function saveAnswers(userId: string, attemptId: string, input: unknown) {
  const body = input as { answers?: unknown; revision?: unknown } | null;
  const parsed = answerMapSchema.safeParse(body?.answers);
  if (!parsed.success || !Number.isInteger(body?.revision) || Number(body?.revision) < 0) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "The answer set or revision is invalid.",
      parsed.success ? undefined : formatValidationIssues(parsed.error.issues),
    );
  }
  const row = await getAttemptRow(userId, attemptId);
  if (row.status === "completed") return rawToView(toRawAttempt(row), await getTestRow(userId, row.mockTestId));
  if (row.expiresAt <= new Date()) {
    const complete = await gradeAndFinalize(userId, attemptId, "timeout");
    return rawToView(complete, await getTestRow(userId, row.mockTestId));
  }

  const test = parseTest((await getTestRow(userId, row.mockTestId)).testJson);
  scoreTest(test, parsed.data);
  const expectedRevision = Number(body?.revision);
  const changed = await db
    .update(attempts)
    .set({ answersJson: parsed.data, answerRevision: sql`${attempts.answerRevision} + 1` })
    .where(and(
      eq(attempts.id, attemptId),
      eq(attempts.clerkUserId, userId),
      eq(attempts.status, "in_progress"),
      gt(attempts.expiresAt, new Date()),
      eq(attempts.answerRevision, expectedRevision),
    ))
    .returning({ id: attempts.id });
  if (!changed.length) {
    const latest = await getAttemptRow(userId, attemptId);
    if (latest.status === "completed") return rawToView(toRawAttempt(latest), await getTestRow(userId, latest.mockTestId));
    throw new ApiError(409, "ANSWER_CONFLICT", "This attempt changed in another tab. Reload to use the latest saved answers.");
  }
  return readAttempt(userId, attemptId);
}

export async function submitAttempt(userId: string, attemptId: string) {
  const current = await getAttemptRow(userId, attemptId);
  const attempt =
    current.status === "completed"
      ? toRawAttempt(current)
      : await gradeAndFinalize(userId, attemptId, current.expiresAt <= new Date() ? "timeout" : "manual");
  const test = await getTestRow(userId, attempt.mock_test_id);
  return rawToView(attempt, test);
}

export async function listHistory(userId: string) {
  const rows = await db
    .select({
      attempt: attempts,
      testTitle: mockTests.title,
    })
    .from(attempts)
    .innerJoin(mockTests, eq(attempts.mockTestId, mockTests.id))
    .where(and(eq(attempts.clerkUserId, userId), eq(attempts.status, "completed")))
    .orderBy(desc(attempts.completedAt));
  return rows.map(({ attempt, testTitle }) => ({
    id: attempt.id,
    mockTestId: attempt.mockTestId,
    testTitle,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    percentage: attempt.percentage,
    completedAt: attempt.completedAt?.toISOString() ?? null,
  }));
}
