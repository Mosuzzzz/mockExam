# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Bun, React + Vite + TypeScript, ElysiaJS, Zod, Drizzle ORM, PostgreSQL in Docker Compose for local development, and Tailwind CSS.

## Users

Students who use an external LLM to make practice questions and want to take them as a timed exam.

## Product Purpose

MockTest turns a user's mock-test JSON into a validated, timed multiple-choice exam. Success means students can import a test, take and review it, and return to their saved attempts later.

## Positioning

Question creation stays with the student's choice of LLM. MockTest provides a provider-independent format and a focused exam runner without requiring a paid LLM API.

## Operating Context

Students generate MockTest JSON v1 outside the app, then paste it or upload a `.json` file. They take a timed test in a browser, submit answers, review explanations, and may retake the test. Primary workflows must work from a 360 px viewport upward.

## Capabilities and Constraints

- One local workspace with no accounts or sign-in.
- Import, validate, save, take, score, review, retake, and delete multiple-choice tests.
- Each question has exactly four options; tests have 1–100 questions and duration from 1–180 minutes.
- The server owns scoring and tests and attempts are stored in the local PostgreSQL database.
- Keep tests and answer sets primarily as JSON in PostgreSQL. Run PostgreSQL in Docker for local development; no separate AI service, queue, or microservice in the MVP.
- After submission, mark every question's result and let students copy or download incorrect and unanswered items as JSON for an external LLM.
- Direct LLM integration, lecture-file extraction, classroom management, short-answer grading, social features, and offline exam mode are outside the MVP.

## Evidence on Hand

The product requirements and a sample MockTest JSON document are in `docs/AI Mock Test SRS.md` and `docs/Mock Test Overview.md`. The repository has no existing brand assets or testimonials; do not fabricate any.

## Product Principles

- Stay independent of LLM providers.
- Keep importing and starting a test quick.
- Hide answers and explanations until submission.
- Keep the data model and runtime small.
- Store tests and attempt history locally; source study files are not needed.

## Accessibility & Inclusion

Controls must be keyboard reachable, visibly focused, and labeled. Correctness must not rely on color alone. The primary flows must work at 360 px and wider.
