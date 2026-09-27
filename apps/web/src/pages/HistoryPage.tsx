import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorNotice, LoadingState } from "../components/Feedback";
import { formatDate } from "../lib/format";
import type { HistoryItem } from "../lib/types";
import { useApi, errorMessage } from "../lib/useApi";

export function HistoryPage() {
  const api = useApi();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await api<HistoryItem[]>("/api/history"));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-stack history-page">
      <div className="page-heading"><div><h1>Attempt history</h1><p>Each finished practice session stays here, ready to review.</p></div></div>
      {error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}
      {loading ? <LoadingState label="Loading your history" /> : items.length === 0 ? (
        <section className="empty-state history-empty"><div className="empty-rule" /><div className="empty-icon"><CalendarDays size={19} aria-hidden="true" /></div><h2>Your finished tests will show up here.</h2><p>Once you submit an attempt, you’ll be able to revisit the score and every answer.</p><Link className="btn btn-primary" to="/dashboard">Find a test</Link></section>
      ) : (
        <section className="history-table-wrap">
          <div className="history-table-head"><span>Test</span><span>Completed</span><span>Score</span><span>Result</span><span className="sr-only">Review</span></div>
          <ol className="history-table">
            {items.map((item) => <li key={item.id}>
              <div className="history-test"><strong>{item.testTitle}</strong><span>{item.totalQuestions} questions</span></div>
              <span className="history-date">{formatDate(item.completedAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              <span className="history-score">{item.score}/{item.totalQuestions}</span>
              <span className="history-percent">{item.percentage}%</span>
              <Link className="history-review" to={`/result/${item.id}`}>Review <ArrowRight size={15} aria-hidden="true" /></Link>
            </li>)}
          </ol>
        </section>
      )}
    </div>
  );
}
