import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Clock3, FilePlus2, History, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorNotice, LoadingState } from "../components/Feedback";
import { useApi, errorMessage } from "../lib/useApi";
import { formatDate, formatDuration } from "../lib/format";
import type { HistoryItem, SavedTest } from "../lib/types";

export function DashboardPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [savedTests, history] = await Promise.all([
        api<SavedTest[]>("/api/tests"),
        api<HistoryItem[]>("/api/history"),
      ]);
      setTests(savedTests);
      setRecent(history.slice(0, 4));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  const startTest = async (testId: string) => {
    setStartingId(testId);
    try {
      const attempt = await api<{ id: string; status: "in_progress" | "completed" }>(`/api/tests/${testId}/attempts`, { method: "POST" });
      navigate(attempt.status === "completed" ? `/result/${attempt.id}` : `/exam/${attempt.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setStartingId("");
    }
  };

  const removeTest = async (test: SavedTest) => {
    const historyText = test.attemptCount ? ` Its ${test.attemptCount} completed ${test.attemptCount === 1 ? "attempt" : "attempts"} will also be removed.` : "";
    if (!window.confirm(`Delete “${test.title}”?${historyText} This cannot be undone.`)) return;
    try {
      await api(`/api/tests/${test.id}`, { method: "DELETE" });
      setTests((current) => current.filter((item) => item.id !== test.id));
      setRecent((current) => current.filter((item) => item.mockTestId !== test.id));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const attemptCount = tests.reduce((total, test) => total + test.attemptCount, 0);
  return (
    <div className="page-stack">
      <div className="page-heading dashboard-heading">
        <div><h1>Your practice workspace</h1><p>Choose a test to continue, or bring in a new set of questions.</p></div>
        <Link className="btn btn-primary" to="/create"><FilePlus2 size={17} aria-hidden="true" /> Import a test</Link>
      </div>

      {error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}

      {loading ? <LoadingState label="Loading your tests" /> : (
        <>
          <div className="summary-line" aria-label="Workspace summary">
            <span><strong>{tests.length}</strong> {tests.length === 1 ? "test" : "tests"} saved</span>
            <span className="summary-separator" aria-hidden="true" />
            <span><strong>{attemptCount}</strong> completed {attemptCount === 1 ? "attempt" : "attempts"}</span>
            <span className="summary-separator" aria-hidden="true" />
            <span>{recent[0] ? `Last practice ${formatDate(recent[0].completedAt)}` : "Ready for your first practice"}</span>
          </div>

          {tests.length === 0 ? (
            <section className="empty-state">
              <div className="empty-rule" />
              <h2>Your first test is one import away.</h2>
              <p>Paste JSON from your study tool or upload a `.json` file. MockTest checks the format before you save it.</p>
              <Link className="btn btn-primary" to="/create"><FilePlus2 size={17} aria-hidden="true" /> Import your first test</Link>
            </section>
          ) : (
            <section className="content-section">
              <div className="section-heading"><h2>Saved tests</h2><span>{tests.length} {tests.length === 1 ? "test" : "tests"}</span></div>
              <ul className="test-list">
                {tests.map((test) => (
                  <li className="test-row" key={test.id}>
                    <div className="test-main">
                      <h3>{test.title}</h3>
                      <p>{test.description || "Ready when you are."}</p>
                      <div className="test-meta"><span><ListBullet />{test.questionCount} questions</span><span><Clock3 size={14} aria-hidden="true" />{formatDuration(test.durationMinutes)}</span><span><History size={14} aria-hidden="true" />{test.attemptCount} {test.attemptCount === 1 ? "attempt" : "attempts"}</span></div>
                    </div>
                    <div className="test-latest">
                      {test.latestAttempt ? <><span className="latest-score">{test.latestAttempt.score}/{test.latestAttempt.totalQuestions}</span><span className="latest-caption">Latest result · {test.latestAttempt.percentage}%</span></> : <span className="latest-caption">Not taken yet</span>}
                    </div>
                    <div className="test-actions">
                      <button className="btn btn-secondary" type="button" onClick={() => void startTest(test.id)} disabled={startingId === test.id}>
                        {startingId === test.id ? "Opening…" : test.attemptCount ? "Retake" : "Start test"}<ArrowRight size={16} aria-hidden="true" />
                      </button>
                      <button className="icon-button delete-test" type="button" title={`Delete ${test.title}`} aria-label={`Delete ${test.title}`} onClick={() => void removeTest(test)}><Trash2 size={17} aria-hidden="true" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recent.length > 0 && <section className="content-section recent-section">
            <div className="section-heading"><h2>Recent attempts</h2><Link className="text-link" to="/history">See history <ArrowRight size={14} aria-hidden="true" /></Link></div>
            <ul className="recent-list">
              {recent.map((item) => <li key={item.id}><div className="recent-test"><strong>{item.testTitle}</strong><span>{formatDate(item.completedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></div><div className="recent-score"><strong>{item.percentage}%</strong><span>{item.score}/{item.totalQuestions}</span></div><Link className="recent-open" to={`/result/${item.id}`} aria-label={`Review ${item.testTitle} result`}><ArrowRight size={17} aria-hidden="true" /></Link></li>)}
            </ul>
          </section>}
        </>
      )}
    </div>
  );
}

function ListBullet() { return <span className="meta-square" aria-hidden="true" />; }
