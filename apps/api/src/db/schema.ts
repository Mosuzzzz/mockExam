import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnswerMap, MockTest } from "@mocktest/shared";

export const mockTests = pgTable(
  "mock_tests",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    questionCount: integer("question_count").notNull(),
    testJson: jsonb("test_json").$type<MockTest>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("mock_tests_updated").on(table.updatedAt)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: text("id").primaryKey(),
    mockTestId: text("mock_test_id")
      .notNull()
      .references(() => mockTests.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["in_progress", "completed"] }).notNull(),
    answersJson: jsonb("answers_json").$type<AnswerMap>().notNull().default(sql`'{}'::jsonb`),
    answerRevision: integer("answer_revision").notNull().default(0),
    score: integer("score"),
    totalQuestions: integer("total_questions").notNull(),
    percentage: integer("percentage"),
    completionReason: text("completion_reason", { enum: ["manual", "timeout"] }),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("attempts_completed").on(table.completedAt),
    index("attempts_test").on(table.mockTestId),
    uniqueIndex("attempts_one_active_per_test")
      .on(table.mockTestId)
      .where(sql`${table.status} = 'in_progress'`),
  ],
);
