# MockTest Overview

MockTest turns mock-exam JSON made with any LLM or study tool into a timed multiple-choice exam. Question generation stays outside the app; MockTest does not call an AI API.

The application is designed for one local workspace. It has no accounts or sign-in, and test data is stored in the current browser with `localStorage`.

## Main workflow

```text
Create questions elsewhere → Import JSON → Validate → Take timed exam → Review result → Retake
```

## Features

- Paste or upload a MockTest JSON file and see validation feedback.
- Save tests in browser storage and return to them from the dashboard.
- Take a timed exam with answer autosave, question navigation, and refresh recovery.
- Review scores, correct answers, and explanations after submission.
- Browse attempt history and retake saved tests.
- Copy or download incorrect and unanswered questions as JSON for an external LLM.

## Stack

- Bun workspaces
- React, Vite, and TypeScript
- Zod validation
- Browser `localStorage`
- Tailwind CSS

## Local architecture

```text
React + Vite (localhost:5173)
          │
          ▼
Browser localStorage
```

The browser app owns persistence, answer validation, deadlines, and scoring. It hides answers and explanations from the exam screen until submission. Browser storage is editable and local to one browser profile, so this design is for personal practice.

## Data model

The versioned workspace entry stores full tests and attempts, including answer maps, revisions, deadlines, and completed scores. Deleting a test also deletes its attempts.

## Pages

- `/` and `/dashboard` — local workspace and saved tests
- `/create` — paste or upload a test
- `/exam/:attemptId` — timed exam
- `/result/:attemptId` — score and answer review
- `/history` — completed attempts

## Local setup

Install dependencies with `bun install`, then run `bun run dev`. No database service is needed. Data stays in the current browser and is removed if its site storage is cleared.
