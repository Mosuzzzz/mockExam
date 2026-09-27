# MockTest MVP Implementation Plan

Based on `AI Mock Test SRS.md` (v1.2) and `Mock Test Overview.md`.

## Current state and target

The core V1 application is implemented in this repository. Its target journey is Google/GitHub sign-in → import JSON → save test → timed exam → submit → review and export missed questions → history → retake. Remaining release work includes verifying real OAuth sign-in in a browser and production deployment settings.

Use Bun, React/Vite/TypeScript, ElysiaJS, Clerk, Zod, Drizzle, PostgreSQL in Docker for local development, and Tailwind with selective shadcn/ui. Keep question generation external and store tests and answer sets as JSON.

## Implemented decisions to resolve specification gaps

These implementation choices are reflected in the app and the updated SRS.

| Topic | Proposed default |
| --- | --- |
| Duration | Require an integer from 1–180 minutes, following §6.2. Update FR-13's optional wording to match. |
| Import limit | Enforce 1 MiB on both client and server; enforce the recommended 120-character title limit. Reject whitespace-only required strings. |
| Attempt lifecycle | Store `status` (`in_progress` or `completed`), `expires_at`, and a completion reason (`manual` or `timeout`). Result fields stay null until completion. |
| Refresh and recovery | Persist answers through an authenticated answer-save endpoint. Resume an existing active attempt for the same test; a retake after completion creates a new attempt. |
| Timer authority | Derive the deadline from server start time. The client displays remaining time using the deadline and server clock offset; refreshing never restarts it. |
| Closed tab or lost connection | The browser submits at expiry when connected. The API finalizes expired attempts from the last saved answers on the next relevant request, before returning dashboard/history/attempt data. No background queue is needed. Unsynced offline edits cannot be guaranteed to count. |
| Submission races | Finalize transactionally once. Repeated submissions return the stored result; saves after completion or expiry cannot change answers. |
| Answer visibility | Exam responses exclude answer keys and explanations; completed result responses include them. This supports focused practice, not proctoring: the user already supplied the source JSON. |
| Unanswered questions | Award zero credit; show unanswered separately in review. Report incorrect as total minus correct, explicitly including unanswered. |
| Saved test changes | Imported tests are immutable in V1. Re-import creates a new test, keeping historical grading stable. |
| Deletion | Confirm deletion of a test and all associated attempts, then cascade within the database. |

Use question IDs as answer-map keys. Validate that submitted keys belong to the test and each selected value is an integer from 0–3; omitted keys mean unanswered. Never accept client-supplied ownership, scores, or timestamps as authoritative.

## Build sequence

### 1. Foundation and shared contract

- Create Bun workspaces: `apps/web`, `apps/api`, and `packages/shared`.
- Set up TypeScript, development scripts, environment examples, and a root README.
- Implement MockTest JSON v1 as a shared Zod schema, including unique question IDs and all documented limits.
- Define public exam, completed result, and API error types separately from the full imported payload.
- Add a valid sample JSON file and a copyable LLM prompt based on the same contract. The SRS example has escaped brackets; use the overview's valid JSON as the fixture basis.

Exit criteria: both apps start locally; the shared schema accepts the sample and produces field-specific errors for invalid imports.

### 2. Authentication and persistence

- Configure Clerk for Google and GitHub only, with frontend session controls and backend token verification.
- Create Drizzle migrations for `mock_tests` and `attempts`, including the lifecycle fields proposed above.
- Use PostgreSQL foreign keys and cascading deletion; index owner IDs, test IDs, and history timestamps used in queries.
- Centralize authenticated ownership checks. Return a consistent not-found response for missing or unowned records.
- Keep Clerk secrets and `DATABASE_URL` in server-only configuration.

Exit criteria: either provider signs in successfully; unauthenticated requests fail; one user's IDs cannot expose or modify another user's records.

### 3. Import and saved-test dashboard

- Build landing/sign-in, dashboard, and `/create` pages.
- Support paste and `.json` upload, parse errors, schema errors, size checks, and a validated preview showing title, count, and duration.
- Revalidate imports on the server before storing them.
- Implement test list, create, read, and delete endpoints. Return only necessary metadata in list responses.
- Show empty/loading/error states, attempt count, latest completed score, and delete confirmation.
- Include the copyable external-LLM prompt and sample download.

Exit criteria: a user can paste or upload a valid test, see it after reload, and delete it with its attempts; invalid imports show actionable errors and are never saved.

### 4. Timed exam and reliable submission

- Start or resume an owned attempt and route the exam by attempt ID (`/exam/:attemptId`) so refresh resolves one specific attempt. This refines the overview's test-ID route.
- Render one question with four options, Previous/Next, direct navigation, answer status, and a visible timer.
- Save answer changes with ordered requests and revision checks so stale requests cannot overwrite newer answers. Display saving/saved/retry states.
- Add `PATCH /api/attempts/:id/answers` to the documented API for persistence and recovery.
- Use `GET /api/attempts/:id` to return active progress or a completed result, with appropriate answer-key visibility.
- Confirm manual submission and show unanswered count. Auto-submit at expiry and reconcile expired attempts on the server.
- Grade from the stored test and validated answers. Finalize answers, score, percentage, and timestamps in one transaction.
- Handle reloads, multiple tabs, retrying submissions, and answer-save versus submit races. Warn before leaving with unsaved changes.

Exit criteria: refresh preserves saved answers and the original deadline; duplicate submissions create one result; expired attempts reject further answer edits; failed saves or submissions have a clear recovery path.

### 5. Results, history, and retakes

- Build `/result/:attemptId` with score, percentage, correct/incorrect/unanswered counts, selected and correct options, and optional explanations.
- Identify each question's outcome and provide a versioned JSON export of incorrect and unanswered items to copy or download for an external LLM.
- Build `/history` with test title, score, percentage, and completion date, ordered newest first.
- Connect dashboard summaries to persisted attempts.
- Retake starts a fresh attempt while completed attempts remain unchanged.

Exit criteria: results survive logout/login; review matches server scoring; retakes preserve earlier history.

### 6. Release checks and deployment

- Add focused unit tests for schema boundaries, duplicate IDs, grading, invalid answer maps, and rounding.
- Add API integration tests for authentication/ownership, cascading deletion, persistence, deadlines, concurrent finalization, and stale saves.
- Add Playwright coverage for import → exam → result → history → retake, plus validation errors, refresh recovery, and timer expiry. Use controlled test auth for automation and check real Google/GitHub redirects in staging.
- Check keyboard navigation, focus, labels, non-color status indicators, and layouts at 360 px and desktop widths.
- Check Chromium, Firefox, and WebKit; smoke-check Safari for the stated compatibility target.
- Measure core-page usability against the approximately 2.5-second target and normal API processing against the sub-500 ms target under a documented representative load.
- Deploy a Bun API instance with persistent PostgreSQL storage and HTTPS. Serve the built frontend and `/api` under one origin where practical.
- Document migrations, production Clerk/OAuth settings, environment variables, health checks, PostgreSQL backups, and restore steps. Confirm a restore before release.

Exit criteria: the SRS V1 acceptance flow works in the deployed environment, with persistent data and passing critical checks.

## Suggested source layout

```text
apps/
  web/src/
    components/
    pages/
    features/{auth,tests,exam,results,history}/
    lib/
  api/src/
    auth/
    db/
    routes/
    services/
packages/shared/
  mocktest-schema.ts
  types.ts
  fixtures/
data/
docs/
```

Exclude database files and secrets from version control. Keep authorization and grading in API services, with small route handlers and one shared validation contract.

## Dependencies and priority

Build phases 1–5 in order, adding relevant checks alongside each phase; phase 6 is the release gate. Prioritize one complete working journey before visual polish or optional analytics.

External setup needed: a Clerk application with both OAuth providers, permitted development/production redirects, and a hosting target with persistent writable disk. Local schema, database, and UI work can begin before production hosting is selected.

Defer all SRS future enhancements until V1 is accepted: additional question types, analytics, sharing, direct LLM integration, and offline/PWA support.
