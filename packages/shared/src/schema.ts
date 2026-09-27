import { z } from "zod";

const requiredText = z.string().trim().min(1, "Must not be empty");

export const questionSchema = z
  .object({
    id: requiredText,
    type: z.literal("multiple_choice"),
    question: requiredText,
    options: z.tuple([requiredText, requiredText, requiredText, requiredText]),
    answer: z.number().int().min(0).max(3),
    explanation: z.string().optional(),
  })
  .strict();

export const mockTestSchema = z
  .object({
    version: z.literal("1.0"),
    title: requiredText.max(120, "Title must be 120 characters or fewer"),
    description: z.string().optional(),
    duration_minutes: z.number().int().min(1).max(180),
    questions: z.array(questionSchema).min(1).max(100),
  })
  .strict()
  .superRefine((test, context) => {
    const seen = new Set<string>();
    test.questions.forEach((question, index) => {
      if (seen.has(question.id)) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "id"],
          message: `Duplicate question ID "${question.id}"`,
        });
      }
      seen.add(question.id);
    });
  });

export const answerMapSchema = z.record(
  z.string().min(1),
  z.number().int().min(0).max(3),
);

export type MockTest = z.infer<typeof mockTestSchema>;
export type MockQuestion = z.infer<typeof questionSchema>;
export type AnswerMap = z.infer<typeof answerMapSchema>;

export function formatValidationIssues(issues: readonly z.ZodIssue[]) {
  return issues.map((issue) => ({
    path: issue.path.length ? issue.path.map(String).join(".") : "document",
    message: issue.message,
  }));
}
