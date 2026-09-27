import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const mockTests = sqliteTable(
  "mock_tests",
  {
    id: text("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    questionCount: integer("question_count").notNull(),
    testJson: text("test_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("mock_tests_owner_created").on(table.clerkUserId, table.createdAt)],
);

export const attempts = sqliteTable(
  "attempts",
  {
    id: text("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    mockTestId: text("mock_test_id")
      .notNull()
      .references(() => mockTests.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["in_progress", "completed"] }).notNull(),
    answersJson: text("answers_json").notNull().default("{}"),
    answerRevision: integer("answer_revision").notNull().default(0),
    score: integer("score"),
    totalQuestions: integer("total_questions").notNull(),
    percentage: integer("percentage"),
    completionReason: text("completion_reason", { enum: ["manual", "timeout"] }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("attempts_owner_completed").on(table.clerkUserId, table.completedAt),
    index("attempts_test").on(table.mockTestId),
    uniqueIndex("attempts_one_active_per_user_test")
      .on(table.clerkUserId, table.mockTestId)
      .where(sql`${table.status} = 'in_progress'`),
  ],
);
