import "./env";
import { Elysia } from "elysia";
import { ApiError } from "./errors";
import {
  createTest,
  deleteTest,
  listHistory,
  listTests,
  readAttempt,
  readTest,
  saveAnswers,
  startAttempt,
  submitAttempt,
} from "./services/attempts";

export const app = new Elysia()
  .onError(({ error, set }) => {
    if (error instanceof ApiError) {
      set.status = error.status;
      return { error: error.code, message: error.message, details: error.details };
    }
    if (error instanceof Error) {
      console.error(error);
      set.status = 500;
      return { error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." };
    }
    set.status = 500;
    return { error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." };
  })
  .get("/api/health", () => ({ ok: true }))
  .get("/api/tests", () => listTests())
  .post("/api/tests", async ({ body, request }) => {
    const headerLength = Number(request.headers.get("content-length") ?? 0);
    const bodyLength = new TextEncoder().encode(JSON.stringify(body)).byteLength;
    if (headerLength > 1_048_576 || bodyLength > 1_048_576) {
      throw new ApiError(413, "TEST_TOO_LARGE", "A mock test must be 1 MB or smaller.");
    }
    return createTest(body);
  })
  .get("/api/tests/:id", ({ params }) => readTest(params.id))
  .delete("/api/tests/:id", ({ params }) => deleteTest(params.id))
  .post("/api/tests/:id/attempts", ({ params }) => startAttempt(params.id))
  .get("/api/attempts/:id", ({ params }) => readAttempt(params.id))
  .patch("/api/attempts/:id/answers", ({ body, params }) => saveAnswers(params.id, body))
  .post("/api/attempts/:id/submit", ({ params }) => submitAttempt(params.id))
  .get("/api/history", () => listHistory());

export default app;
