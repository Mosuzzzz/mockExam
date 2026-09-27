import { describe, expect, it } from "bun:test";
import { mockTestSchema } from "./schema";

const sample = {
  version: "1.0",
  title: "Database Midterm",
  description: "Practice for Chapters 1–5",
  duration_minutes: 60,
  questions: [
    {
      id: "q1",
      type: "multiple_choice",
      question: "What is a primary key?",
      options: ["A unique identifier", "A table name", "A server", "A keyword"],
      answer: 0,
      explanation: "A primary key identifies each row.",
    },
  ],
};

describe("MockTest JSON v1", () => {
  it("accepts a valid four-option multiple-choice test", () => {
    expect(mockTestSchema.safeParse(sample).success).toBe(true);
  });

  it("rejects duplicate question IDs with a field path", () => {
    const duplicate = { ...sample, questions: [sample.questions[0], { ...sample.questions[0] }] };
    const result = mockTestSchema.safeParse(duplicate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "questions.1.id")).toBe(true);
    }
  });

  it("rejects invalid answer indexes and option counts", () => {
    const invalid = {
      ...sample,
      questions: [{ ...sample.questions[0], options: ["A", "B", "C"], answer: 4 }],
    };
    expect(mockTestSchema.safeParse(invalid).success).toBe(false);
  });

  it("enforces question count and duration limits", () => {
    expect(mockTestSchema.safeParse({ ...sample, duration_minutes: 181 }).success).toBe(false);
    expect(mockTestSchema.safeParse({ ...sample, questions: [] }).success).toBe(false);
  });
});
