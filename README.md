# MockTest

MockTest turns multiple-choice questions made with an external study tool into a validated, timed exam. It saves tests and attempts in PostgreSQL, scores exams on the server, and lets students review, retake, and export missed questions for an LLM.

Question generation and review stay with the AI tool the student chooses. MockTest does not send questions to an AI service.

## Features

- Sign in with Google or GitHub through Clerk.
- Paste MockTest JSON or upload a `.json` file and review validation feedback.
- Take a timed exam with autosaved answers and direct question navigation.
- Submit, view scores and explanations, check attempt history, and retake a test.
- Copy or download incorrect and unanswered questions as `mocktest.missed-questions.v1` JSON for an LLM.
- Keep each user's tests and attempts private to their account.

## Requirements

- [Bun](https://bun.sh/)
- Docker with Docker Compose
- Clerk CLI (`npm install -g clerk` if it is not installed)
- A Clerk development application linked to this project, with Google and GitHub sign-in configured.

## Run locally

Install workspace dependencies:

```bash
bun install
```

Sign in to Clerk and link this project to the MockTest development application. Skip `clerk auth login` if the CLI is already signed in:

```bash
clerk auth login
clerk link --app app_3JuD2WF6xVSShFnVXdV5IoWm73B
clerk env pull --app app_3JuD2WF6xVSShFnVXdV5IoWm73B --file .env
```

In the root `.env`, keep the Clerk keys pulled by the CLI and ensure these local settings are present:

```dotenv
DATABASE_URL=postgresql://mocktest:mocktest@127.0.0.1:5432/mocktest
CLERK_AUTHORIZED_PARTIES=http://localhost:5173,http://127.0.0.1:5173
```

In Docker Desktop, start the local PostgreSQL 17 database:

```bash
docker compose up -d postgres
```

Then run the web app and API:

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173), sign in, and import a test. The API listens on port `3001` and applies pending PostgreSQL migrations when it starts. PostgreSQL data persists in the Docker volume `mocktest_postgres_data` when the container stops.

Stop PostgreSQL while keeping its data:

```bash
docker compose down
```

If Clerk needs setup, check that the root `.env` contains the Clerk publishable and secret keys, then restart the dev server. Keep `CLERK_SECRET_KEY` server-side and never commit `.env`. Configure Google and GitHub as sign-in methods in the Clerk Dashboard.

## Missed-question JSON

After submitting an exam, the result page marks every question as correct, incorrect, or unanswered. **Copy JSON** copies the incorrect and unanswered questions to the clipboard; **Download JSON** saves them to a file. The export includes each question, its four options, your answer (or `null` if unanswered), the correct answer, and any explanation from the test. Use **Preview JSON** to inspect the exact payload first.

The shared contract is `mocktest.missed-questions.v1`. It is defined in [`packages/shared/src/missed-questions.ts`](packages/shared/src/missed-questions.ts):

```json
{
  "format": "mocktest.missed-questions.v1",
  "test_title": "Database Midterm",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What does a primary key do?",
      "options": ["Uniquely identifies a row", "Names a table", "Connects to a server", "Sorts every query"],
      "outcome": "incorrect",
      "user_answer_index": 1,
      "user_answer": "Names a table",
      "correct_answer_index": 0,
      "correct_answer": "Uniquely identifies a row",
      "explanation": "A primary key gives each row a unique identifier."
    }
  ]
}
```

## Import a test

MockTest accepts version `1.0` JSON with a title, an optional description, a duration from 1–180 minutes, and 1–100 questions. Each question needs a unique `id`, type `multiple_choice`, a prompt, exactly four options, and an `answer` index from `0` to `3`. An `explanation` is optional.

Imports are limited to 1 MB. The full JSON contract lives in [`packages/shared/src/schema.ts`](packages/shared/src/schema.ts). See the [sample test](docs/sample-mocktest.json) and [copyable prompt](docs/MockTest%20JSON%20Prompt.md) for examples.

## Useful commands

| Command | Purpose |
| --- | --- |
| `docker compose up -d postgres` | Start the local PostgreSQL database. |
| `docker compose down` | Stop the database container and preserve its named volume. |
| `bun run dev` | Start the Vite web app and Elysia API. |
| `bun run build` | Build the web app for production. |
| `bun run build:vercel` | Build the frontend and prepare it for Vercel; production builds also apply database migrations. |
| `bun run start` | Apply PostgreSQL migrations and start the API; serves `apps/web/dist` if it exists. |
| `bun run typecheck` | Type-check the shared package, API, and web app. |
| `bun run test` | Run shared-schema and API service tests. |
| `bun run test:e2e` | Run Playwright checks for the frontend. |
| `bun run db:generate` | Generate a Drizzle migration from the database schema. |
| `bun run db:migrate` | Apply pending PostgreSQL migrations. |
| `bun run db:import-sqlite` | Copy legacy `data/mocktest.sqlite` records into an empty PostgreSQL database; leaves the source untouched. |

Playwright captures desktop and mobile landing-page screenshots in `.impeccable/review/`. On a new machine, install Chromium once with:

```bash
bunx playwright install chromium
```

## Project layout

```text
apps/web/         React, Vite, and TypeScript frontend
apps/api/         Elysia API, Clerk verification, and PostgreSQL persistence
apps/api/drizzle-postgres/  PostgreSQL migrations
packages/shared/  MockTest and missed-question JSON schemas
docs/             Requirements, implementation plan, prompt, and sample JSON
compose.yaml      Local PostgreSQL service and persistent Docker volume
```

The API verifies Clerk session tokens, scopes records to the signed-in user, and calculates scores from the saved test. Active exam responses omit answer keys and explanations; completed results include them.

## Deploy to Vercel

The Vercel project uses the repository root. It builds the Vite frontend into Vercel's static `public` output and runs the Elysia API as a Vercel Function. The `vercel.json` file defines the build command and client-side route rewrites. Local development can continue using Docker Compose for PostgreSQL.

1. Import this GitHub repository into Vercel. Keep **Root Directory** set to `.` (the repository root); don't set it to `apps/web`. Keep **Automatically expose System Environment Variables** enabled so production migrations and Clerk origin checks can identify the deployment.
2. Create a Supabase project, then open **Connect** in its dashboard and copy the **Transaction pooler** connection string into Vercel's `DATABASE_URL`. Keep the connection string's `sslmode=require` setting. If you use the Vercel Supabase integration, the app also accepts its `POSTGRES_URL` variable for runtime database connections.
3. Copy the **Session pooler** connection string into Vercel's `MIGRATION_DATABASE_URL`. Drizzle applies migrations during a production build through this single-session connection. The Vercel Supabase integration's `POSTGRES_URL_NON_POOLING` variable is also accepted for migrations.
4. Add `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to Vercel's environment variables. The publishable key is included in the built frontend; the secret key stays server-side.
5. Leave `CLERK_AUTHORIZED_PARTIES` unset on Vercel to allow the Vercel project and deployment URLs automatically. If you use a custom domain, set it to that exact HTTPS origin, such as `https://mocktest.example.com`.

Add the production database and Clerk variables before the first production build. For fully working Preview deployments, configure Preview variables too and use a separate Supabase project for preview data. Preview builds do not apply migrations. Local Docker data is not copied to Supabase. Keep `.env` and database files out of Git.

For Supabase connection modes and their use cases, see [Supabase's PostgreSQL connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres). See [Vercel's Elysia guide](https://vercel.com/docs/frameworks/backend/elysia) for the serverless app entry point and [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) for SPA rewrites.

## Project documents

- [AI Mock Test SRS](docs/AI%20Mock%20Test%20SRS.md)
- [Mock Test Overview](docs/Mock%20Test%20Overview.md)
- [Implementation Plan](docs/Implementation%20Plan.md)
