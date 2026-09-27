import { and, desc, eq } from "drizzle-orm";
import {
  answerMapSchema,
  formatValidationIssues,
  mockTestSchema,
  type AnswerMap,
  type MockTest,
} from "@mocktest/shared";
import { attempts, mockTests } from "../db/schema";
import { db, sqlite } from "../db/client";
import { ApiError, notFound } from "../errors";

type AttemptRow = typeof attempts.$inferSelect;
type TestRow = typeof mockTests.$inferSelect;
type RawAttempt = {
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

function parseTest(row: TestRow): MockTest {
  const parsed = mockTestSchema.safeParse(JSON.parse(row.testJson));
  if (!parsed.success) throw new ApiError(500, "CORRUPT_TEST", "A saved test could not be read.");
  return parsed.data;
}

function parseAnswers(value: string): AnswerMap {
  const parsed = answerMapSchema.safeParse(JSON.parse(value));
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
    started_at: row.startedAt.getTime(),
    expires_at: row.expiresAt.getTime(),
    completed_at: row.completedAt?.getTime() ?? null,
  };
}

function gradeAndFinalize(userId: string, attemptId: string, reason: "manual" | "timeout") {
  const finalize = sqlite.transaction((owner: string, id: string, requestedReason: "manual" | "timeout") => {
    for (let tries = 0; tries < 4; tries += 1) {
      const row = sqlite
        .query("SELECT * FROM attempts WHERE id = ? AND clerk_user_id = ?")
        .get(id, owner) as RawAttempt | null;
      if (!row) throw notFound();
      if (row.status === "completed") return row;

      const testRow = sqlite
        .query("SELECT test_json FROM mock_tests WHERE id = ? AND clerk_user_id = ?")
        .get(row.mock_test_id, owner) as { test_json: string } | null;
      if (!testRow) throw notFound();
      const parsed = mockTestSchema.safeParse(JSON.parse(testRow.test_json));
      if (!parsed.success) throw new ApiError(500, "CORRUPT_TEST", "A saved test could not be read.");
      const answers = parseAnswers(row.answers_json);
      const result = scoreTest(parsed.data, answers);
      const completedAt = Date.now();
      const actualReason = requestedReason === "timeout" || completedAt >= row.expires_at ? "timeout" : "manual";
      const updated = sqlite
        .query(
          `UPDATE attempts
           SET status = 'completed', score = ?, total_questions = ?, percentage = ?,
               completion_reason = ?, completed_at = ?
           WHERE id = ? AND clerk_user_id = ? AND status = 'in_progress' AND answers_json = ? AND answer_revision = ?`,
        )
        .run(
          result.score,
          result.total,
          result.percentage,
          actualReason,
          completedAt,
          id,
          owner,
          row.answers_json,
          row.answer_revision,
        );
      if (updated.changes) {
        return sqlite.query("SELECT * FROM attempts WHERE id = ? AND clerk_user_id = ?").get(id, owner) as RawAttempt;
      }
    }
    throw new ApiError(409, "SUBMISSION_CONFLICT", "The answers changed while the exam was being submitted. Please submit again.");
  });
  return finalize.immediate(userId, attemptId, reason) as RawAttempt;
}

function rawToView(row: RawAttempt, testRow: TestRow, serverNow = Date.now()) {
  const test = parseTest(testRow);
  const answers = parseAnswers(row.answers_json);
  const visibleTest =
    row.status === "completed"
      ? test
      : {
          version: test.version,
          title: test.title,
          description: test.description,
          duration_minutes: test.duration_minutes,
          questions: test.questions.map(({ answer: _answer, explanation: _explanation, ...question }) => question),
        };
  return {
    id: row.id,
    status: row.status,
    answers,
    answerRevision: row.answer_revision,
    startedAt: new Date(row.started_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
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
    testJson: JSON.stringify(test),
    createdAt: now,
    updatedAt: now,
  });
  return { id, title: test.title, durationMinutes: test.duration_minutes, questionCount: test.questions.length };
}

export async function readTest(userId: string, testId: string) {
  const row = await getTestRow(userId, testId);
  return { ...row, test: parseTest(row) };
}

export async function deleteTest(userId: string, testId: string) {
  const deleted = await db
    .delete(mockTests)
    .where(and(eq(mockTests.id, testId), eq(mockTests.clerkUserId, userId)))
    .returning({ id: mockTests.id });
  if (!deleted.length) throw notFound();
  return { deleted: true };
}

function startOrResume(userId: string, testId: string): RawAttempt {
  const start = sqlite.transaction((owner: string, id: string) => {
    const test = sqlite
      .query("SELECT test_json, duration_minutes, question_count FROM mock_tests WHERE id = ? AND clerk_user_id = ?")
      .get(id, owner) as { test_json: string; duration_minutes: number; question_count: number } | null;
    if (!test) throw notFound();

    const now = Date.now();
    const active = sqlite
      .query("SELECT * FROM attempts WHERE mock_test_id = ? AND clerk_user_id = ? AND status = 'in_progress' LIMIT 1")
      .get(id, owner) as RawAttempt | null;
    if (active && active.expires_at > now) return active;
    if (active) gradeAndFinalize(owner, active.id, "timeout");

    const testData = JSON.parse(test.test_json) as MockTest;
    const attemptId = crypto.randomUUID();
    const deadline = now + test.duration_minutes * 60_000;
    sqlite
      .query(
        `INSERT INTO attempts
         (id, clerk_user_id, mock_test_id, status, answers_json, answer_revision, total_questions, started_at, expires_at)
         VALUES (?, ?, ?, 'in_progress', '{}', 0, ?, ?, ?)`,
      )
      .run(attemptId, owner, id, testData.questions.length, now, deadline);
    return sqlite.query("SELECT * FROM attempts WHERE id = ? AND clerk_user_id = ?").get(attemptId, owner) as RawAttempt;
  });
  return start.immediate(userId, testId) as RawAttempt;
}

export async function startAttempt(userId: string, testId: string) {
  let attempt: RawAttempt;
  try {
    attempt = startOrResume(userId, testId);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("UNIQUE constraint failed")) throw error;
    const [existing] = await db
      .select()
      .from(attempts)
      .where(and(eq(attempts.mockTestId, testId), eq(attempts.clerkUserId, userId), eq(attempts.status, "in_progress")))
      .limit(1);
    if (!existing) throw error;
    attempt = toRawAttempt(existing);
  }
  const row = await getTestRow(userId, testId);
  if (attempt.status === "in_progress" && attempt.expires_at <= Date.now()) {
    attempt = gradeAndFinalize(userId, attempt.id, "timeout");
  }
  return rawToView(attempt, row);
}

export async function readAttempt(userId: string, attemptId: string) {
  let attempt = toRawAttempt(await getAttemptRow(userId, attemptId));
  if (attempt.status === "in_progress" && attempt.expires_at <= Date.now()) {
    attempt = gradeAndFinalize(userId, attemptId, "timeout");
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
  if (row.expiresAt.getTime() <= Date.now()) {
    const complete = gradeAndFinalize(userId, attemptId, "timeout");
    return rawToView(complete, await getTestRow(userId, row.mockTestId));
  }

  const test = parseTest(await getTestRow(userId, row.mockTestId));
  scoreTest(test, parsed.data);
  const expectedRevision = Number(body?.revision);
  const changed = sqlite
    .query(
      `UPDATE attempts SET answers_json = ?, answer_revision = answer_revision + 1
       WHERE id = ? AND clerk_user_id = ? AND status = 'in_progress' AND expires_at > ? AND answer_revision = ?`,
    )
    .run(JSON.stringify(parsed.data), attemptId, userId, Date.now(), expectedRevision);
  if (!changed.changes) {
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
      : gradeAndFinalize(userId, attemptId, current.expiresAt.getTime() <= Date.now() ? "timeout" : "manual");
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
