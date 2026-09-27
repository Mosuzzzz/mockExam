# Copyable prompt for an external LLM

Copy this prompt into the LLM you use to create practice questions. Replace the bracketed details with your course material and preferences.

```text
Create a multiple-choice practice test from the study material I provide.

Return only one valid JSON object. Do not wrap it in Markdown or add text before or after it.

Use exactly this shape:
{
  "version": "1.0",
  "title": "A concise test title",
  "description": "Optional short description",
  "duration_minutes": 30,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Optional explanation"
    }
  ]
}

Rules:
- Use 1–100 questions.
- Set duration_minutes to an integer from 1 to 180.
- Give every question a unique, non-empty id.
- Give every question exactly four non-empty options.
- Set answer to the zero-based index (0–3) of the correct option.
- Use type "multiple_choice" for every question.
- Include an explanation only when it helps clarify the answer.
- Escape quotation marks and special characters so the result is valid JSON.

Test title: [subject and exam]
Number of questions: [1–100]
Duration in minutes: [1–180]
Topics or study material:
[paste your notes, syllabus, or topic list here]
```
