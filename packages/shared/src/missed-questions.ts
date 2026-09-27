import { z } from "zod";
import { answerMapSchema, type AnswerMap, type MockTest } from "./schema";

export const missedQuestionItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal("multiple_choice"),
  question: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  outcome: z.enum(["incorrect", "unanswered"]),
  user_answer_index: z.number().int().min(0).max(3).nullable(),
  user_answer: z.string().nullable(),
  correct_answer_index: z.number().int().min(0).max(3),
  correct_answer: z.string(),
  explanation: z.string().nullable(),
}).strict();

export const missedQuestionsExportSchema = z.object({
  format: z.literal("mocktest.missed-questions.v1"),
  test_title: z.string().min(1),
  questions: z.array(missedQuestionItemSchema),
}).strict();

export type MissedQuestionsExport = z.infer<typeof missedQuestionsExportSchema>;

export function createMissedQuestionsExport(test: MockTest, answers: AnswerMap): MissedQuestionsExport {
  const checkedAnswers = answerMapSchema.parse(answers);
  return missedQuestionsExportSchema.parse({
    format: "mocktest.missed-questions.v1",
    test_title: test.title,
    questions: test.questions.flatMap((question) => {
      const selected = checkedAnswers[question.id];
      if (selected === question.answer) return [];
      return [{
        id: question.id,
        type: "multiple_choice" as const,
        question: question.question,
        options: question.options,
        outcome: selected === undefined ? "unanswered" as const : "incorrect" as const,
        user_answer_index: selected ?? null,
        user_answer: selected === undefined ? null : question.options[selected],
        correct_answer_index: question.answer,
        correct_answer: question.options[question.answer],
        explanation: question.explanation ?? null,
      }];
    }),
  });
}
