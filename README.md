# MockTest

MockTest turns multiple-choice questions from your study tool into a focused, timed exam. Import a test, take it in your browser, then review your score, answers, and explanations. Your tests and attempts are saved in a local PostgreSQL database.

MockTest does not generate questions or send them to an AI service. Create questions with the study tool you choose, then import them as JSON.

## Features

- Paste or upload a test and get feedback when its JSON needs fixing.
- Take a timed exam with answers saved as you go.
- Review scores, correct answers, and explanations after submitting.
- Keep attempt history and retake saved tests.
- Copy or download incorrect and unanswered questions as JSON for further study.

## Web app

![MockTest dashboard example](docs/screenshots/dashboard.png)

*Dashboard preview with example test and attempt data.*

After starting the app, open one of these pages:

- [Dashboard](http://localhost:5173/dashboard)
- [Import a test](http://localhost:5173/create)
- [Attempt history](http://localhost:5173/history)

## Run locally

You need [Bun](https://bun.sh/) and Docker with Docker Compose.

Install dependencies and configure the local database connection:

```bash
bun install
cp .env.example .env
```

Start PostgreSQL and the web app and API:

```bash
docker compose up -d postgres
bun run dev
```

Open [http://localhost:5173](http://localhost:5173). The web app sends API requests to the local API on port `3001`. The API applies pending database migrations when it starts.

PostgreSQL data is kept in the `mocktest_postgres_data` Docker volume. Stop the database with:

```bash
docker compose down
```

To delete the saved database and start fresh, run `docker compose down -v`. This removes saved tests and attempts.

The API listens on `127.0.0.1` by default. This is a local, single-workspace app without sign-in or user separation.

## Import format

MockTest accepts JSON version `1.0` with a title, an optional description, a duration from 1 to 180 minutes, and 1 to 100 questions. Each question needs a unique ID, the type `multiple_choice`, a question, exactly four non-empty options, and the zero-based index of the correct option (`0` to `3`). An explanation is optional. Imports are limited to 1 MB.

Example:

```json
{
  "version": "1.0",
  "title": "Database Midterm",
  "description": "Practice for chapters 1–5",
  "duration_minutes": 30,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What does a primary key do?",
      "options": [
        "Uniquely identifies a row",
        "Names a table",
        "Connects to a server",
        "Sorts every query"
      ],
      "answer": 0,
      "explanation": "A primary key gives each row a unique identifier."
    }
  ]
}
```

See [`docs/sample-mocktest.json`](docs/sample-mocktest.json) for a complete sample, or copy the prompt from [`docs/Mock Test JSON Prompt.md`](docs/Mock%20Test%20JSON%20Prompt.md) into your study tool. The schema is defined in [`packages/shared/src/schema.ts`](packages/shared/src/schema.ts).

## Missed-question export

After submitting, use **Copy JSON** or **Download JSON** to export incorrect and unanswered questions. The `mocktest.missed-questions.v1` format includes your answer, the correct answer, and any explanation. Use **Preview JSON** on the result page to inspect the export before copying or downloading it. Its schema is defined in [`packages/shared/src/missed-questions.ts`](packages/shared/src/missed-questions.ts).

## Commands

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the web app and API for local development. |
| `bun run typecheck` | Type-check the shared package, API, and web app. |
| `bun run test` | Run shared-schema and API tests. |
| `bun run test:e2e` | Run Playwright end-to-end checks. |
| `bun run db:generate` | Generate a Drizzle migration from the database schema. |
| `bun run db:migrate` | Apply pending PostgreSQL migrations. |
| `bun run db:import-sqlite` | Import legacy records from `data/mocktest.sqlite` into an empty PostgreSQL database. |

## Project structure

```text
apps/web/                 React, Vite, and TypeScript frontend
apps/api/                 Elysia API, PostgreSQL persistence, and migrations
packages/shared/          Test and missed-question JSON schemas
docs/sample-mocktest.json Example test data
compose.yaml              Local PostgreSQL service
```
