import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Copy, Download, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorNotice, LoadingState } from "../components/Feedback";
import { formatDate } from "../lib/format";
import type { AttemptView } from "../lib/types";
import { useApi, errorMessage } from "../lib/useApi";
import { createMissedQuestionsExport } from "@mocktest/shared";

export function ResultPage() {
  const { attemptId = "" } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retaking, setRetaking] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const view = await api<AttemptView>(`/api/attempts/${attemptId}`);
      if (view.status === "in_progress") {
        navigate(`/exam/${view.id}`, { replace: true });
        return;
      }
      setAttempt(view);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [api, attemptId, navigate]);

  useEffect(() => { void load(); }, [load]);

  const retake = async () => {
    if (!attempt || attempt.status !== "completed") return;
    setRetaking(true);
    try {
      const next = await api<{ id: string; status: "in_progress" | "completed" }>(`/api/tests/${attempt.mockTestId}/attempts`, { method: "POST" });
      navigate(next.status === "completed" ? `/result/${next.id}` : `/exam/${next.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setRetaking(false);
    }
  };

  if (loading) return <div className="page-stack"><LoadingState label="Loading your result" /></div>;
  if (error && !attempt) return <div className="page-stack"><ErrorNotice onRetry={() => void load()}>{error}</ErrorNotice><Link className="text-link" to="/dashboard">Back to your tests</Link></div>;
  if (!attempt || attempt.status !== "completed") return null;

  const test = attempt.test;
  const score = attempt.score ?? 0;
  const correct = test.questions.filter((question) => attempt.answers[question.id] === question.answer).length;
  const unanswered = test.questions.filter((question) => attempt.answers[question.id] === undefined).length;
  const incorrect = test.questions.length - correct;
  const missedExport = createMissedQuestionsExport(test, attempt.answers);
  const missedJson = JSON.stringify(missedExport, null, 2);

  const copyMissedQuestions = async () => {
    if (!missedExport.questions.length) return;
    try {
      await navigator.clipboard.writeText(missedJson);
      setExportStatus("Missed-question JSON copied to clipboard.");
    } catch {
      setExportStatus("Could not copy automatically. Download the JSON file instead.");
    }
  };

  const downloadMissedQuestions = () => {
    if (!missedExport.questions.length) return;
    const blob = new Blob([missedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const filename = test.title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "mocktest";
    anchor.href = url;
    anchor.download = `${filename}-missed-questions.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setExportStatus("Missed-question JSON downloaded.");
  };

  return (
    <div className="page-stack result-page">
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <Link className="back-link" to="/history"><ArrowLeft size={16} aria-hidden="true" /> Back to attempt history</Link>
      <section className="result-heading">
        <div className="result-title-block"><h1>{test.title}</h1><p>Completed {formatDate(attempt.completedAt, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}{attempt.completionReason === "timeout" ? " · Time expired" : ""}</p></div>
        <div className="result-actions"><button className="btn btn-secondary" type="button" onClick={() => void retake()} disabled={retaking}>{retaking ? "Starting…" : "Retake this test"}<ArrowRight size={16} aria-hidden="true" /></button></div>
      </section>

      <section className="score-overview" aria-label="Exam score">
        <div className="score-primary"><span className="score-value">{score}<span>/{test.questions.length}</span></span><span className="score-label">Correct answers</span></div>
        <div className="score-percent"><strong>{attempt.percentage ?? 0}%</strong><span>Overall score</span></div>
        <div className="score-breakdown"><div><span className="result-state-dot result-correct" /><strong>{correct}</strong><span>Correct</span></div><div><span className="result-state-dot result-incorrect" /><strong>{incorrect}</strong><span>Incorrect</span></div><div><span className="result-state-dot result-unanswered" /><strong>{unanswered}</strong><span>Unanswered</span></div></div>
      </section>

      <section className="missed-export" aria-labelledby="missed-export-title">
        <div className="missed-export-copy">
          <h2 id="missed-export-title">Copy missed questions for your LLM</h2>
          <p>{missedExport.questions.length ? `Includes ${missedExport.questions.length} incorrect or unanswered ${missedExport.questions.length === 1 ? "question" : "questions"}, your answer, the correct answer, and any explanation.` : "You got every question right. There are no missed questions to export."}</p>
        </div>
        <div className="missed-export-actions">
          <button className="btn btn-secondary btn-small" type="button" onClick={() => void copyMissedQuestions()} disabled={!missedExport.questions.length}><Copy size={15} aria-hidden="true" /> Copy JSON</button>
          <button className="btn btn-secondary btn-small" type="button" onClick={downloadMissedQuestions} disabled={!missedExport.questions.length}><Download size={15} aria-hidden="true" /> Download JSON</button>
        </div>
        <p className="missed-export-status" role="status" aria-live="polite">{exportStatus}</p>
        {missedExport.questions.length > 0 && <details className="missed-export-preview">
          <summary>Preview JSON</summary>
          <pre>{missedJson}</pre>
        </details>}
      </section>

      <section className="review-section">
        <div className="section-heading"><div><h2>Answer review</h2><p>Review each choice and the explanation from your test.</p></div><span>{test.questions.length} questions</span></div>
        <ol className="review-list">
          {test.questions.map((question, questionIndex) => {
            const selected = attempt.answers[question.id];
            const isCorrect = selected === question.answer;
            const isUnanswered = selected === undefined;
            return <li className="review-question" key={question.id}>
              <div className="review-question-head"><span className="review-question-index">{String(questionIndex + 1).padStart(2, "0")}</span><h3>{question.question}</h3><span className={`review-status${isCorrect ? " is-correct" : isUnanswered ? " is-unanswered" : " is-incorrect"}`}>{isCorrect ? <><Check size={14} aria-hidden="true" /> Correct</> : isUnanswered ? <><CircleHelp size={14} aria-hidden="true" /> Unanswered</> : <><X size={14} aria-hidden="true" /> Incorrect</>}</span></div>
              <ul className="review-options">
                {question.options.map((option, optionIndex) => {
                  const correctOption = question.answer === optionIndex;
                  const chosenOption = selected === optionIndex;
                  return <li key={`${question.id}-${optionIndex}`} className={`${correctOption ? "review-option-correct" : ""}${chosenOption && !correctOption ? " review-option-wrong" : ""}`}><span className="review-option-letter">{String.fromCharCode(65 + optionIndex)}</span><span className="review-option-text">{option}</span>{chosenOption && <span className="review-option-label">Your answer</span>}{correctOption && <span className="review-option-label correct-label">Correct answer</span>}</li>;
                })}
              </ul>
              {question.explanation && <p className="explanation"><strong>Explanation</strong><span>{question.explanation}</span></p>}
            </li>;
          })}
        </ol>
      </section>
    </div>
  );
}
