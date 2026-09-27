import type { AnswerMap, MockQuestion, MockTest } from "@mocktest/shared";

export type AttemptQuestion = Omit<MockQuestion, "answer" | "explanation"> & {
  answer?: number;
  explanation?: string;
};

export type AttemptTest = Omit<MockTest, "questions"> & { questions: AttemptQuestion[] };

type AttemptViewFields = {
  id: string;
  mockTestId: string;
  answers: AnswerMap;
  answerRevision: number;
  startedAt: string;
  expiresAt: string;
  completedAt: string | null;
  completionReason: "manual" | "timeout" | null;
  score: number | null;
  totalQuestions: number;
  percentage: number | null;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number | null;
  serverNow: string;
};

export type AttemptView = AttemptViewFields & (
  | { status: "in_progress"; test: AttemptTest }
  | { status: "completed"; test: MockTest }
);

export type SavedTest = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  latestAttempt: {
    score: number | null;
    totalQuestions: number;
    percentage: number | null;
    completedAt: string | null;
  } | null;
};

export type HistoryItem = {
  id: string;
  mockTestId: string;
  testTitle: string;
  score: number | null;
  totalQuestions: number;
  percentage: number | null;
  completedAt: string | null;
};
