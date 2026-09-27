import { describe, expect, it } from "bun:test";
import type { MockTest } from "@mocktest/shared";
import { ApiError } from "../errors";
import { scoreTest } from "./attempts";

const test: MockTest = {
  version: "1.0",
  title: "Practice",
  duration_minutes: 10,
  questions: [
    { id: "q1", type: "multiple_choice", question: "One?", options: ["A", "B", "C", "D"], answer: 1 },
    { id: "q2", type: "multiple_choice", question: "Two?", options: ["A", "B", "C", "D"], answer: 3 },
  ],
};

describe("server scoring", () => {
  it("counts correct answers and leaves unanswered questions at zero", () => {
    expect(scoreTest(test, { q1: 1 })).toEqual({ score: 1, total: 2, percentage: 50 });
  });

  it("rejects answers for IDs that are not part of the test", () => {
    expect(() => scoreTest(test, { foreign: 3 })).toThrow(ApiError);
  });
});
