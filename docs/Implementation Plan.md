# MockTest Implementation Notes

MockTest is a local-only application. Its intended workflow is import JSON → take a timed exam → review and export missed questions → browse history → retake.

## Local stack

Use Bun workspaces, React/Vite/TypeScript, ElysiaJS, Zod, Drizzle, and PostgreSQL in Docker Compose. Keep question generation external and store tests and answer sets as JSON.

## Implemented behavior

- Validate MockTest JSON v1 on the client and again before saving on the server. Enforce the 1 MiB import limit, 1–180 minute duration, 1–100 questions, unique IDs, and four options per question.
- Keep one local workspace with no accounts, identity provider, sessions, or user ownership columns.
- Store imported tests and attempts in local PostgreSQL. Deleting a test cascades to its attempts.
- Start or resume an active attempt for a test. A retake after completion creates a new attempt.
- Derive the deadline from server time; persist answer revisions and reject stale saves.
- Hide answers and explanations during an exam. Grade from the stored test and validated answers, then persist the result transactionally.
- Finalize expired attempts on the next relevant API request; no background queue is required.
- Export incorrect and unanswered questions as `mocktest.missed-questions.v1` JSON.

## Local development

1. Install dependencies with `bun install`.
2. Start PostgreSQL using `docker compose up -d postgres`.
3. Run `bun run dev` to start the Vite frontend and API.
4. The API applies pending migrations during startup. PostgreSQL data persists in the Docker volume.

The API and Vite server bind to localhost for local use. The frontend proxies `/api` to the API.

## Data and API

The `mock_tests` table stores each imported payload and its display metadata. The `attempts` table stores lifecycle state, answers, score, and timestamps. `mock_test_id` has a foreign key with cascading deletion; indexes support test ordering, history, and one active attempt per test.

The API validates input and owns scoring and timer deadlines. It omits answer keys and explanations from active attempt responses, then returns them with completed results.

## Useful checks

- `bun run typecheck` checks the shared package, API, and frontend.
- `bun run test` runs shared-schema and API service tests.
- `bun run test:e2e` runs the Playwright frontend checks.
