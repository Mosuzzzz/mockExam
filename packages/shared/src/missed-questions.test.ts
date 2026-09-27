import { describe, expect, it } from "bun:test";
import { sampleTest } from "./sample";
import { createMissedQuestionsExport, missedQuestionsExportSchema } from "./missed-questions";

describe("missed question export", () => {
  it("includes incorrect and unanswered questions with both answer choices", () => {
    const result = createMissedQuestionsExport(sampleTest, { q1: 2 });

    expect(result.format).toBe("mocktest.missed-questions.v1");
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toMatchObject({
      id: "q1",
      outcome: "incorrect",
      user_answer_index: 2,
      user_answer: sampleTest.questions[0].options[2],
      correct_answer_index: 0,
      correct_answer: sampleTest.questions[0].options[0],
    });
    expect(result.questions[1]).toMatchObject({
      id: "q2",
      outcome: "unanswered",
      user_answer_index: null,
      user_answer: null,
    });
    expect(missedQuestionsExportSchema.parse(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });

  it("returns an empty question list when every answer is correct", () => {
    const answers = Object.fromEntries(sampleTest.questions.map((question) => [question.id, question.answer]));
    expect(createMissedQuestionsExport(sampleTest, answers).questions).toEqual([]);
  });
});
