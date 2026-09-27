# MockTest Overview

MockTest turns mock-exam JSON made with any LLM or study tool into a timed multiple-choice exam. Question generation stays outside the app; MockTest does not call an AI API.

The application is designed for one local workspace. It has no accounts or sign-in, and test data is stored in the local PostgreSQL database.

## Main workflow

```text
Create questions elsewhere → Import JSON → Validate → Take timed exam → Review result → Retake
```

## Features

- Paste or upload a MockTest JSON file and see validation feedback.
- Save tests in PostgreSQL and return to them from the dashboard.
- Take a timed exam with answer autosave, question navigation, and refresh recovery.
- Review scores, correct answers, and explanations after submission.
- Browse attempt history and retake saved tests.
- Copy or download incorrect and unanswered questions as JSON for an external LLM.

## Stack

- Bun workspaces
- React, Vite, and TypeScript
- ElysiaJS API
- Zod validation
- Drizzle ORM and PostgreSQL 17
- Docker Compose for the local PostgreSQL service
- Tailwind CSS

## Local architecture

```text
React + Vite (localhost:5173)
          │ /api proxy
          ▼
ElysiaJS API (localhost:3001)
          │
          ▼
PostgreSQL (localhost:5432)
```

The API owns persistence, answer validation, deadlines, and scoring. Active exam responses omit answer keys and explanations. Completed result responses include them.

## Data model

### `mock_tests`

Stores an ID, title, optional description, duration, question count, full test JSON, and timestamps.

### `attempts`

Stores an ID, test ID, status, saved answers, answer revision, score, total questions, percentage, completion reason, and timestamps. Deleting a test also deletes its attempts.

## Pages

- `/` and `/dashboard` — local workspace and saved tests
- `/create` — paste or upload a test
- `/exam/:attemptId` — timed exam
- `/result/:attemptId` — score and answer review
- `/history` — completed attempts

## Local setup

Install dependencies, start PostgreSQL with `docker compose up -d postgres`, then run `bun run dev`. The Vite server proxies `/api` requests to the local API. The API applies pending PostgreSQL migrations on startup.
