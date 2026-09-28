import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const completedAttempt = {
  id: "e2e-attempt",
  mockTestId: "e2e-test",
  status: "completed",
  answers: { q1: 2 },
  answerRevision: 1,
  startedAt: "2026-09-27T09:00:00.000Z",
  expiresAt: "2026-09-27T09:25:00.000Z",
  completedAt: "2026-09-27T09:10:00.000Z",
  completionReason: "manual",
  score: 0,
  totalQuestions: 2,
  percentage: 0,
  correctCount: 0,
  incorrectCount: 2,
  unansweredCount: 1,
  serverNow: "2026-09-27T09:10:00.000Z",
  test: {
    version: "1.0",
    title: "Database Midterm",
    description: "Practice with relational databases",
    duration_minutes: 25,
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        question: "What does a primary key do?",
        options: ["Uniquely identifies a row", "Names a table", "Connects to a database server", "Sorts every query"],
        answer: 0,
        explanation: "A primary key gives each row a unique identifier.",
      },
      {
        id: "q2",
        type: "multiple_choice",
        question: "Which SQL clause filters rows before grouping?",
        options: ["HAVING", "ORDER BY", "WHERE", "LIMIT"],
        answer: 2,
        explanation: "WHERE filters rows before GROUP BY is applied.",
      },
    ],
  },
} as const;

test("result page copies and downloads missed-question JSON and fits mobile", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const test = completedAttempt.test;
  await page.addInitScript(({ savedTest, savedAttempt }) => {
    localStorage.setItem("mocktest.workspace.v1", JSON.stringify({
      version: 1,
      tests: [{
        id: savedAttempt.mockTestId,
        value: savedTest,
        createdAt: savedAttempt.startedAt,
        updatedAt: savedAttempt.startedAt,
      }],
      attempts: [{
        id: savedAttempt.id,
        mockTestId: savedAttempt.mockTestId,
        status: savedAttempt.status,
        answers: savedAttempt.answers,
        answerRevision: savedAttempt.answerRevision,
        startedAt: savedAttempt.startedAt,
        expiresAt: savedAttempt.expiresAt,
        completedAt: savedAttempt.completedAt,
        completionReason: savedAttempt.completionReason,
        score: savedAttempt.score,
        totalQuestions: savedAttempt.totalQuestions,
        percentage: savedAttempt.percentage,
      }],
    }));
  }, { savedTest: test, savedAttempt: completedAttempt });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/result/e2e-attempt");
  await expect(page.getByRole("heading", { name: "Database Midterm" })).toBeVisible();
  await expect(page.getByText("Incorrect", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Unanswered", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Copy JSON" }).click();
  await expect(page.getByRole("status")).toHaveText("Missed-question JSON copied to clipboard.");
  const copiedJson = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(copiedJson.format).toBe("mocktest.missed-questions.v1");
  expect(copiedJson.questions).toHaveLength(2);
  expect(copiedJson.questions.map((question: { outcome: string }) => question.outcome)).toEqual(["incorrect", "unanswered"]);
  expect(copiedJson.questions[0].user_answer).toBe("Connects to a database server");
  expect(copiedJson.questions[1].user_answer).toBeNull();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("database-midterm-missed-questions.json");
  expect(JSON.parse(await readFile(await download.path(), "utf8"))).toEqual(copiedJson);

  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByRole("button", { name: "Copy JSON" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});
