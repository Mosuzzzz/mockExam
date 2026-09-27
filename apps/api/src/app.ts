import "./env";
import { Elysia } from "elysia";
import { authIsConfigured, authenticateRequest } from "./auth/clerk";
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

const privateApi = new Elysia()
  .derive(async ({ request }) => ({ userId: await authenticateRequest(request) }))
  .onBeforeHandle(({ userId, set }) => {
    if (!authIsConfigured()) {
      set.status = 503;
      return { error: "AUTH_NOT_CONFIGURED", message: "Configure Clerk keys and an authorized origin in the deployment environment." };
    }
    if (!userId) {
      set.status = 401;
      return { error: "UNAUTHENTICATED", message: "Sign in to continue." };
    }
  })
  .get("/api/tests", ({ userId }) => listTests(userId!))
  .post("/api/tests", async ({ body, request, userId }) => {
    const headerLength = Number(request.headers.get("content-length") ?? 0);
    const bodyLength = new TextEncoder().encode(JSON.stringify(body)).byteLength;
    if (headerLength > 1_048_576 || bodyLength > 1_048_576) {
      throw new ApiError(413, "TEST_TOO_LARGE", "A mock test must be 1 MB or smaller.");
    }
    return createTest(userId!, body);
  })
  .get("/api/tests/:id", ({ params, userId }) => readTest(userId!, params.id))
  .delete("/api/tests/:id", ({ params, userId }) => deleteTest(userId!, params.id))
  .post("/api/tests/:id/attempts", ({ params, userId }) => startAttempt(userId!, params.id))
  .get("/api/attempts/:id", ({ params, userId }) => readAttempt(userId!, params.id))
  .patch("/api/attempts/:id/answers", ({ body, params, userId }) => saveAnswers(userId!, params.id, body))
  .post("/api/attempts/:id/submit", ({ params, userId }) => submitAttempt(userId!, params.id))
  .get("/api/history", ({ userId }) => listHistory(userId!));

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
  .get("/api/health", () => ({ ok: true, authenticationConfigured: authIsConfigured() }))
  .use(privateApi);

export default app;
