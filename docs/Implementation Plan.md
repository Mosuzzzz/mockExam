# MockTest Implementation Notes

MockTest is a local-only application. Its intended workflow is import JSON → take a timed exam → review and export missed questions → browse history → retake.

## Local stack

Use Bun workspaces, React/Vite/TypeScript, and Zod. Keep question generation external and store tests and answer sets as JSON in browser `localStorage`.

## Implemented behavior

- Validate MockTest JSON v1 in the browser before saving. Enforce the 1 MiB import limit, 1–180 minute duration, 1–100 questions, unique IDs, and four options per question.
- Keep one local workspace with no accounts, identity provider, sessions, or user ownership columns.
- Store imported tests and attempts in the browser's versioned `localStorage` workspace. Deleting a test also deletes its attempts.
- Start or resume an active attempt for a test. A retake after completion creates a new attempt.
- Derive the deadline from the browser clock; persist answer revisions and reject stale saves.
- Hide answers and explanations on the exam screen. Grade from the stored test and validated answers, then persist the result.
- Finalize expired attempts on the next relevant browser action; no background queue is required.
- Export incorrect and unanswered questions as `mocktest.missed-questions.v1` JSON.

## Local development

1. Install dependencies with `bun install`.
2. Run `bun run dev` to start the Vite frontend.

The web app runs locally. Tests and attempts stay in the current browser profile and can be cleared with site data.

## Browser data

The `mocktest.workspace.v1` storage entry contains imported test payloads and attempt lifecycle state, answers, scores, and timestamps. Each test may have at most one active attempt.

The browser validates input, calculates scores, and tracks timer deadlines. Since the browser stores the answer keys and owns the clock, saved data can be inspected or changed by the user. This design is for practice rather than proctored exams.

## Useful checks

- `bun run typecheck` checks the shared package and frontend.
- `bun run test` runs shared-schema tests.
- `bun run test:e2e` runs the Playwright frontend checks.
