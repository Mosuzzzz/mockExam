import {
  answerMapSchema,
  formatValidationIssues,
  mockTestSchema,
  type AnswerMap,
  type MockTest,
} from "@mocktest/shared";
import { z } from "zod";
import type { AttemptTest, AttemptView, HistoryItem, SavedTest } from "./types";

const STORAGE_KEY = "mocktest.workspace.v1";
const MAX_TEST_BYTES = 1_048_576;

const storedTestSchema = z.object({
  id: z.string().min(1),
  value: mockTestSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

const storedAttemptSchema = z.object({
  id: z.string().min(1),
  mockTestId: z.string().min(1),
  status: z.enum(["in_progress", "completed"]),
  answers: answerMapSchema,
  answerRevision: z.number().int().nonnegative(),
  startedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  completionReason: z.enum(["manual", "timeout"]).nullable(),
  score: z.number().int().nonnegative().nullable(),
  totalQuestions: z.number().int().min(1),
  percentage: z.number().int().min(0).max(100).nullable(),
}).strict();

const workspaceSchema = z.object({
  version: z.literal(1),
  tests: z.array(storedTestSchema),
  attempts: z.array(storedAttemptSchema),
}).strict();

type WorkspaceData = z.infer<typeof workspaceSchema>;
type StoredAttempt = WorkspaceData["attempts"][number];

export class LocalStorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "LocalStorageError";
  }
}

function emptyWorkspace(): WorkspaceData {
  return { version: 1, tests: [], attempts: [] };
}

function readWorkspace(): WorkspaceData {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new LocalStorageError("Browser storage is unavailable. Check your browser settings and reload.", "STORAGE_UNAVAILABLE");
  }
  if (raw === null) return emptyWorkspace();

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new LocalStorageError("Saved browser data could not be read. The MockTest storage entry may be damaged.", "CORRUPT_STORAGE");
  }

  const parsed = workspaceSchema.safeParse(value);
  if (!parsed.success) {
    throw new LocalStorageError("Saved browser data has an invalid format. The MockTest storage entry may be damaged.", "CORRUPT_STORAGE");
  }
  return parsed.data;
}

function writeWorkspace(data: WorkspaceData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
      throw new LocalStorageError("Browser storage is full. Delete some saved tests or attempts, then try again.", "STORAGE_FULL");
    }
    throw new LocalStorageError("MockTest could not save to browser storage. Check your browser settings and try again.", "STORAGE_UNAVAILABLE");
  }
}

function requireTest(data: WorkspaceData, testId: string) {
  const test = data.tests.find((item) => item.id === testId);
  if (!test) throw new LocalStorageError("This test could not be found. It may have been deleted.", "NOT_FOUND");
  return test;
}

function requireAttempt(data: WorkspaceData, attemptId: string) {
  const attempt = data.attempts.find((item) => item.id === attemptId);
  if (!attempt) throw new LocalStorageError("This attempt could not be found. Its test may have been deleted.", "NOT_FOUND");
  return { attempt, test: requireTest(data, attempt.mockTestId) };
}

function scoreTest(test: MockTest, answers: AnswerMap) {
  const questionIds = new Set(test.questions.map((question) => question.id));
  const invalidId = Object.keys(answers).find((id) => !questionIds.has(id));
  if (invalidId) throw new LocalStorageError("An answer refers to a question outside this test.", "INVALID_ANSWER");
  const score = test.questions.reduce((total, question) => total + Number(answers[question.id] === question.answer), 0);
  return { score, total: test.questions.length, percentage: Math.round((score / test.questions.length) * 100) };
}

function finishAttempt(attempt: StoredAttempt, test: MockTest, requestedReason: "manual" | "timeout", now: number) {
  const result = scoreTest(test, attempt.answers);
  attempt.status = "completed";
  attempt.score = result.score;
  attempt.totalQuestions = result.total;
  attempt.percentage = result.percentage;
  attempt.completionReason = requestedReason === "timeout" || now >= Date.parse(attempt.expiresAt) ? "timeout" : "manual";
  attempt.completedAt = new Date(now).toISOString();
}

function examTest(test: MockTest): AttemptTest {
  return {
    version: test.version,
    title: test.title,
    description: test.description,
    duration_minutes: test.duration_minutes,
    questions: test.questions.map(({ answer: _answer, explanation: _explanation, ...question }) => question),
  };
}

function attemptView(attempt: StoredAttempt, test: MockTest, now = Date.now()): AttemptView {
  const common = {
    id: attempt.id,
    mockTestId: attempt.mockTestId,
    answers: attempt.answers,
    answerRevision: attempt.answerRevision,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    completedAt: attempt.completedAt,
    completionReason: attempt.completionReason,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    percentage: attempt.percentage,
    correctCount: attempt.score,
    incorrectCount: attempt.score === null ? null : attempt.totalQuestions - attempt.score,
    unansweredCount: attempt.status === "completed"
      ? test.questions.filter((question) => attempt.answers[question.id] === undefined).length
      : null,
    serverNow: new Date(now).toISOString(),
  };

  if (attempt.status === "completed") return { ...common, status: "completed", test };
  return { ...common, status: "in_progress", test: examTest(test) };
}

export function listTests(): SavedTest[] {
  const data = readWorkspace();
  const completed = data.attempts
    .filter((attempt) => attempt.status === "completed")
    .sort((a, b) => Date.parse(b.completedAt ?? "") - Date.parse(a.completedAt ?? ""));

  return data.tests
    .map((saved) => {
      const attempts = completed.filter((attempt) => attempt.mockTestId === saved.id);
      const latest = attempts[0];
      return {
        id: saved.id,
        title: saved.value.title,
        description: saved.value.description ?? null,
        durationMinutes: saved.value.duration_minutes,
        questionCount: saved.value.questions.length,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        attemptCount: attempts.length,
        latestAttempt: latest
          ? { score: latest.score, totalQuestions: latest.totalQuestions, percentage: latest.percentage, completedAt: latest.completedAt }
          : null,
      };
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function listHistory(): HistoryItem[] {
  const data = readWorkspace();
  const titles = new Map(data.tests.map((test) => [test.id, test.value.title]));
  return data.attempts
    .filter((attempt) => attempt.status === "completed")
    .sort((a, b) => Date.parse(b.completedAt ?? "") - Date.parse(a.completedAt ?? ""))
    .map((attempt) => ({
      id: attempt.id,
      mockTestId: attempt.mockTestId,
      testTitle: titles.get(attempt.mockTestId) ?? "Deleted test",
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.percentage,
      completedAt: attempt.completedAt,
    }));
}

export function createTest(input: unknown) {
  const parsed = mockTestSchema.safeParse(input);
  if (!parsed.success) {
    throw new LocalStorageError(
      "Fix the marked fields, then try saving again.",
      "VALIDATION_ERROR",
      formatValidationIssues(parsed.error.issues),
    );
  }

  const test = parsed.data;
  if (new TextEncoder().encode(JSON.stringify(test)).byteLength > MAX_TEST_BYTES) {
    throw new LocalStorageError("A mock test must be 1 MB or smaller.", "TEST_TOO_LARGE");
  }

  const data = readWorkspace();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  data.tests.push({ id, value: test, createdAt: now, updatedAt: now });
  writeWorkspace(data);
  return { id, title: test.title, durationMinutes: test.duration_minutes, questionCount: test.questions.length };
}

export function deleteTest(testId: string) {
  const data = readWorkspace();
  if (!data.tests.some((test) => test.id === testId)) {
    throw new LocalStorageError("This test could not be found. It may have been deleted.", "NOT_FOUND");
  }
  data.tests = data.tests.filter((test) => test.id !== testId);
  data.attempts = data.attempts.filter((attempt) => attempt.mockTestId !== testId);
  writeWorkspace(data);
  return { deleted: true };
}

export function startAttempt(testId: string): AttemptView {
  const data = readWorkspace();
  const saved = requireTest(data, testId);
  const now = Date.now();
  const active = data.attempts.find((attempt) => attempt.mockTestId === testId && attempt.status === "in_progress");

  if (active && Date.parse(active.expiresAt) > now) return attemptView(active, saved.value, now);
  if (active) finishAttempt(active, saved.value, "timeout", now);

  const startedAt = new Date(now).toISOString();
  const attempt: StoredAttempt = {
    id: crypto.randomUUID(),
    mockTestId: testId,
    status: "in_progress",
    answers: {},
    answerRevision: 0,
    startedAt,
    expiresAt: new Date(now + saved.value.duration_minutes * 60_000).toISOString(),
    completedAt: null,
    completionReason: null,
    score: null,
    totalQuestions: saved.value.questions.length,
    percentage: null,
  };
  data.attempts.push(attempt);
  writeWorkspace(data);
  return attemptView(attempt, saved.value, now);
}

export function readAttempt(attemptId: string): AttemptView {
  const data = readWorkspace();
  const { attempt, test } = requireAttempt(data, attemptId);
  const now = Date.now();
  if (attempt.status === "in_progress" && Date.parse(attempt.expiresAt) <= now) {
    finishAttempt(attempt, test.value, "timeout", now);
    writeWorkspace(data);
  }
  return attemptView(attempt, test.value, now);
}

export function saveAnswers(attemptId: string, input: unknown): AttemptView {
  const bodySchema = z.object({ answers: answerMapSchema, revision: z.number().int().nonnegative() }).strict();
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    throw new LocalStorageError("The answer set or revision is invalid.", "VALIDATION_ERROR", formatValidationIssues(parsed.error.issues));
  }

  const data = readWorkspace();
  const { attempt, test } = requireAttempt(data, attemptId);
  if (attempt.status === "completed") return attemptView(attempt, test.value);

  const now = Date.now();
  if (Date.parse(attempt.expiresAt) <= now) {
    finishAttempt(attempt, test.value, "timeout", now);
    writeWorkspace(data);
    return attemptView(attempt, test.value, now);
  }
  if (parsed.data.revision !== attempt.answerRevision) {
    throw new LocalStorageError("This attempt changed in another tab. Reload to use the latest saved answers.", "ANSWER_CONFLICT");
  }
  scoreTest(test.value, parsed.data.answers);
  attempt.answers = parsed.data.answers;
  attempt.answerRevision += 1;
  writeWorkspace(data);
  return attemptView(attempt, test.value, Date.now());
}

export function submitAttempt(attemptId: string): AttemptView {
  const data = readWorkspace();
  const { attempt, test } = requireAttempt(data, attemptId);
  if (attempt.status === "in_progress") {
    const now = Date.now();
    finishAttempt(attempt, test.value, Date.parse(attempt.expiresAt) <= now ? "timeout" : "manual", now);
    writeWorkspace(data);
    return attemptView(attempt, test.value, now);
  }
  return attemptView(attempt, test.value);
}
