import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleAlert, Clock3, Flag, RotateCcw } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorNotice, LoadingState } from "../components/Feedback";
import { formatClock } from "../lib/format";
import type { AttemptView } from "../lib/types";
import { errorMessage } from "../lib/useApi";
import { useApi } from "../lib/useApi";

export function ExamPage() {
  const { attemptId = "" } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [saveError, setSaveError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const answersRef = useRef<Record<string, number>>({});
  const attemptRef = useRef<AttemptView | null>(null);
  const revisionRef = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveFailedRef = useRef(false);
  const automaticSubmitRef = useRef(false);
  const submittingRef = useRef(false);

  const acceptAttempt = useCallback((view: AttemptView) => {
    if (view.status === "completed") {
      navigate(`/result/${view.id}`, { replace: true });
      return;
    }
    attemptRef.current = view;
    answersRef.current = view.answers;
    revisionRef.current = view.answerRevision;
    setAttempt(view);
    setAnswers(view.answers);
    setClockOffset(new Date(view.serverNow).getTime() - Date.now());
    setRemaining(Math.max(0, Math.ceil((new Date(view.expiresAt).getTime() - new Date(view.serverNow).getTime()) / 1000)));
  }, [navigate]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    try {
      const view = await api<AttemptView>(`/api/attempts/${attemptId}`, { signal });
      acceptAttempt(view);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setLoadError(errorMessage(reason));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [acceptAttempt, api, attemptId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const persistAnswers = (next: Record<string, number>) => {
    setSaveState("saving");
    setSaveError("");
    const task = saveQueue.current.then(async () => {
      const view = await api<AttemptView>(`/api/attempts/${attemptId}/answers`, {
        method: "PATCH",
        body: { answers: next, revision: revisionRef.current },
      });
      revisionRef.current = view.answerRevision;
      saveFailedRef.current = false;
      if (view.status === "completed") {
        navigate(`/result/${view.id}`, { replace: true });
        return;
      }
      if (answersRef.current === next) setSaveState("saved");
    });
    saveQueue.current = task.then(() => undefined, () => undefined);
    void task.catch((reason: unknown) => {
      saveFailedRef.current = true;
      setSaveState("error");
      setSaveError(errorMessage(reason));
    });
    return task;
  };

  const submit = useCallback(async (automatic = false, retry = false) => {
    if (submittingRef.current) return;
    const current = attemptRef.current;
    if (!current) return;
    const unanswered = current.test.questions.length - Object.keys(answersRef.current).length;
    if (!automatic && !retry && !window.confirm(unanswered ? `You have ${unanswered} unanswered ${unanswered === 1 ? "question" : "questions"}. Submit your exam now?` : "Submit your exam now? You can’t change answers after submission.")) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      await saveQueue.current;
      if (saveFailedRef.current) await persistAnswers(answersRef.current);
      const result = await api<AttemptView>(`/api/attempts/${attemptId}/submit`, { method: "POST" });
      navigate(`/result/${result.id}`, { replace: true });
    } catch (reason) {
      setSubmitError(errorMessage(reason));
      if (automatic) automaticSubmitRef.current = false;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [api, attemptId, navigate]);

  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (!attempt) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - (Date.now() + clockOffset)) / 1000));
      setRemaining(seconds);
      if (seconds === 0 && !automaticSubmitRef.current) {
        automaticSubmitRef.current = true;
        void submitRef.current(true);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, clockOffset]);

  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (saveState === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [saveState]);

  const chooseAnswer = (questionId: string, answerIndex: number) => {
    const next = { ...answersRef.current, [questionId]: answerIndex };
    answersRef.current = next;
    setAnswers(next);
    void persistAnswers(next);
  };

  if (loading) return <main className="exam-loading"><LoadingState label="Resuming your exam" /></main>;
  if (loadError) return <main className="exam-loading"><div className="exam-load-error"><ErrorNotice onRetry={() => void load()}>{loadError}</ErrorNotice><Link className="text-link" to="/dashboard">Back to your tests</Link></div></main>;
  if (!attempt) return null;

  const questions = attempt.test.questions;
  const question = questions[index];
  const answeredCount = Object.keys(answers).length;
  const timeLow = remaining <= 300;

  return (
    <main className="exam-page">
      <header className="exam-header">
        <Link className="exam-brand" to="/dashboard" aria-label="Exit exam and return to your tests"><img className="brand-logo" src="/mocktest.png" alt="MockTest" /></Link>
        <div className="exam-title"><span>{attempt.test.title}</span><span>{questions.length} questions</span></div>
        <div className={`exam-timer${timeLow ? " timer-low" : ""}`} role="timer" aria-label={`${formatClock(remaining)} remaining`}><Clock3 size={16} aria-hidden="true" /><span>{formatClock(remaining)}</span><small>remaining</small></div>
      </header>

      <div className="exam-progress-strip"><span style={{ transform: `scaleX(${answeredCount / questions.length})` }} /></div>

      <section className="exam-body">
        <div className="exam-main-column">
          <div className="exam-context"><span>Question {index + 1} of {questions.length}</span><span className="save-indicator" aria-live="polite">{saveState === "saving" ? <><span className="save-dot saving-dot" /> Saving answers…</> : saveState === "error" ? <><CircleAlert size={14} aria-hidden="true" /> Not saved</> : <><span className="save-dot" /> Answers saved</>}</span></div>
          <section className="question-sheet" aria-labelledby="question-title">
            <div className="question-number">{String(index + 1).padStart(2, "0")}</div>
            <h1 id="question-title">{question.question}</h1>
            <fieldset className="choice-list">
              <legend>Choose one answer</legend>
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.id] === optionIndex;
                return <label className={`answer-choice${selected ? " selected" : ""}`} key={`${question.id}-${optionIndex}`}>
                  <input type="radio" name={question.id} value={optionIndex} checked={selected} onChange={() => chooseAnswer(question.id, optionIndex)} />
                  <span className="choice-letter">{String.fromCharCode(65 + optionIndex)}</span><span className="choice-text">{option}</span><span className="choice-selected" aria-hidden="true">{selected && <Check size={16} />}</span>
                </label>;
              })}
            </fieldset>
          </section>

          {saveError && <ErrorNotice onRetry={() => void persistAnswers(answersRef.current)}>{saveError}</ErrorNotice>}
          {submitError && <ErrorNotice onRetry={() => void submit(true, true)}>{submitError}</ErrorNotice>}

          <div className="exam-controls">
            <button className="btn btn-quiet" type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}><ChevronLeft size={17} aria-hidden="true" /> Previous</button>
            <div className="exam-control-right">
              {index < questions.length - 1 ? <button className="btn btn-secondary" type="button" onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}>Next <ChevronRight size={17} aria-hidden="true" /></button> : <button className="btn btn-primary" type="button" onClick={() => void submit()} disabled={submitting}>{submitting ? "Submitting…" : "Submit exam"}<Flag size={16} aria-hidden="true" /></button>}
            </div>
          </div>
        </div>

        <aside className="question-navigation">
          <div className="question-nav-heading"><h2>Questions</h2><span>{answeredCount} of {questions.length} answered</span></div>
          <div className="question-grid" role="group" aria-label="Go to a question">
            {questions.map((item, questionIndex) => {
              const isAnswered = answers[item.id] !== undefined;
              return <button key={item.id} type="button" className={`question-number-button${questionIndex === index ? " current" : ""}${isAnswered ? " answered" : ""}`} aria-label={`Question ${questionIndex + 1}${isAnswered ? ", answered" : ", unanswered"}`} aria-current={questionIndex === index ? "step" : undefined} onClick={() => setIndex(questionIndex)}>{isAnswered ? <Check size={14} aria-hidden="true" /> : questionIndex + 1}</button>;
            })}
          </div>
          <div className="question-legend"><span><span className="legend-dot legend-done" /> Answered</span><span><span className="legend-dot legend-current" /> Current</span><span><span className="legend-dot" /> Unanswered</span></div>
          <div className="question-nav-rule" />
          <p className="exam-guidance">Your answers save automatically. You can move between questions until you submit.</p>
          {index < questions.length - 1 && <button className="text-button submit-link" type="button" onClick={() => void submit()}>Submit exam early <ChevronRight size={15} aria-hidden="true" /></button>}
          {remaining === 0 && submitting && <p className="expiry-note"><RotateCcw size={14} aria-hidden="true" /> Time is up. Submitting your saved answers…</p>}
        </aside>
      </section>
      <footer className="exam-footer"><span>MockTest</span><span>{attempt.test.title}</span><span>Question {index + 1} / {questions.length}</span></footer>
    </main>
  );
}
