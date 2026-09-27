# MockTest

MockTest turns multiple-choice questions made with an external study tool into a validated, timed exam. It saves tests and attempts in a local PostgreSQL database, scores exams on the server, and lets you review, retake, and export missed questions.

Question generation and review stay with the AI tool you choose. MockTest does not send questions to an AI service. The app has one local workspace with no accounts or sign-in.

## Run locally

Requirements: [Bun](https://bun.sh/) and Docker with Docker Compose.

Install dependencies:

```bash
bun install
```

Copy `.env.example` to `.env` if you need to change the default local database connection. Start PostgreSQL:

```bash
docker compose up -d postgres
```

Start the web app and API:

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173). The web app uses the API on port `3001`; the API applies pending migrations when it starts. PostgreSQL data persists in the `mocktest_postgres_data` Docker volume.

Stop PostgreSQL while keeping its data:

```bash
docker compose down
```

The API listens on localhost by default. This local workspace has no sign-in or user separation, so keep it on your own machine.

## Features

- Paste MockTest JSON or upload a `.json` file and review validation feedback.
- Take a timed exam with autosaved answers and direct question navigation.
- Submit, view scores and explanations, check attempt history, and retake a test.
- Copy or download incorrect and unanswered questions as `mocktest.missed-questions.v1` JSON for an LLM.

## Import a test

MockTest accepts version `1.0` JSON with a title, an optional description, a duration from 1–180 minutes, and 1–100 questions. Each question needs a unique `id`, type `multiple_choice`, a prompt, exactly four options, and an `answer` index from `0` to `3`. An `explanation` is optional.

Imports are limited to 1 MB. The full JSON contract lives in [`packages/shared/src/schema.ts`](packages/shared/src/schema.ts). See the [sample test](docs/sample-mocktest.json) and [copyable prompt](docs/Mock%20Test%20JSON%20Prompt.md) for examples.

## Missed-question JSON

After submitting an exam, the result page marks every question as correct, incorrect, or unanswered. **Copy JSON** copies incorrect and unanswered questions to the clipboard; **Download JSON** saves them to a file. The export includes each question, its options, your answer (or `null` if unanswered), the correct answer, and any explanation. Use **Preview JSON** to inspect the payload first.

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

## Useful commands

| Command | Purpose |
| --- | --- |
| `docker compose up -d postgres` | Start the local PostgreSQL database. |
| `docker compose down` | Stop PostgreSQL and preserve its named volume. |
| `bun run dev` | Start the local Vite web app and Elysia API. |
| `bun run typecheck` | Type-check the shared package, API, and web app. |
| `bun run test` | Run shared-schema and API service tests. |
| `bun run test:e2e` | Run Playwright checks for the frontend. |
| `bun run db:generate` | Generate a Drizzle migration from the database schema. |
| `bun run db:migrate` | Apply pending local PostgreSQL migrations. |
| `bun run db:import-sqlite` | Import legacy `data/mocktest.sqlite` records into an empty PostgreSQL database. |

## Project layout

```text
apps/web/         React, Vite, and TypeScript frontend
apps/api/         Elysia API and PostgreSQL persistence
apps/api/drizzle-postgres/  PostgreSQL migrations
packages/shared/  MockTest and missed-question JSON schemas
docs/             Requirements, implementation notes, prompt, and sample JSON
compose.yaml      Local PostgreSQL service and persistent Docker volume
```

Active exam responses omit answer keys and explanations. Completed results include them. Tests and attempts live in the local PostgreSQL database.

## Project documents

- [AI Mock Test SRS](docs/AI%20Mock%20Test%20SRS.md)
- [Mock Test Overview](docs/Mock%20Test%20Overview.md)
- [Implementation Plan](docs/Implementation%20Plan.md)
