import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Clock3, FilePlus2, Info } from "lucide-react";
import { sampleTest } from "@mocktest/shared";
import { Link } from "react-router-dom";
import { ErrorNotice, LoadingState } from "../components/Feedback";
import { errorMessage } from "../lib/errors";
import { formatDuration } from "../lib/format";
import { listTests } from "../lib/storage";
import type { SavedTest } from "../lib/types";

const sampleQuestion = sampleTest.questions[0];

export function HomePage() {
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTests = useCallback(() => {
    setLoading(true);
    setError("");
    try {
      setTests(listTests());
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTests(); }, [loadTests]);

  return (
    <div className="home-page">
      <header className="home-header">
        <Link className="home-brand" to="/" aria-label="MockTest home">
          <img className="brand-logo" src="/mocktest.png" alt="MockTest" />
        </Link>
        <nav className="home-nav" aria-label="Main navigation">
          <Link to="/dashboard">My tests</Link>
          <Link className="btn btn-primary btn-small" to="/create">
            <FilePlus2 size={15} aria-hidden="true" /> Import a test
          </Link>
        </nav>
      </header>

      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-copy">
            <h1 id="home-title">Your questions, ready for practice.</h1>
            <p>Bring a MockTest JSON set you prepared, take it under a timer, then review each answer and explanation.</p>
            <Link className="btn btn-primary home-primary" to="/create">
              <FilePlus2 size={17} aria-hidden="true" /> Import a test <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <span className="home-copy-note">Paste JSON or upload a .json file.</span>
          </div>

          <section className="question-specimen" aria-labelledby="specimen-title">
            <div className="specimen-heading">
              <div>
                <h2 id="specimen-title">{sampleTest.title}</h2>
                <p>{sampleTest.description}</p>
              </div>
              <span className="specimen-tag">Example</span>
            </div>
            <div className="specimen-meta">
              <span>Question 1 of {sampleTest.questions.length}</span>
              <span><Clock3 size={14} aria-hidden="true" /> {formatDuration(sampleTest.duration_minutes)}</span>
            </div>
            <p className="specimen-question">{sampleQuestion.question}</p>
            <ol className="specimen-options" aria-label="Example answer options">
              {sampleQuestion.options.map((option, index) => (
                <li key={option}>
                  <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                  {option}
                </li>
              ))}
            </ol>
            <p className="specimen-note"><Info size={15} aria-hidden="true" /> Answers and explanations appear after submission.</p>
          </section>
        </section>

        <section className="practice-flow" aria-labelledby="flow-title">
          <div className="flow-heading">
            <h2 id="flow-title">From your question set to a clear review.</h2>
            <p>Keep the questions you already made. MockTest gives you a focused place to practice them.</p>
          </div>
          <ol className="flow-list">
            <li><span>01</span><div><strong>Import</strong><p>Paste or upload your test.</p></div></li>
            <li><span>02</span><div><strong>Practice</strong><p>Answer under a visible timer.</p></div></li>
            <li><span>03</span><div><strong>Review</strong><p>See each answer and explanation.</p></div></li>
          </ol>
        </section>

        {error && <ErrorNotice onRetry={loadTests}>{error}</ErrorNotice>}

        {!loading && tests.length > 0 && (
          <section className="home-tests" aria-labelledby="saved-tests-title">
            <div className="home-tests-heading">
              <div>
                <h2 id="saved-tests-title">Pick up where you left off.</h2>
                <p>Your recently updated tests are ready when you are.</p>
              </div>
              <Link className="text-link" to="/dashboard">Open My tests <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            <ul className="home-test-list">
              {tests.slice(0, 3).map((test) => (
                <li key={test.id}>
                  <div className="home-test-title"><strong>{test.title}</strong>{test.description && <span>{test.description}</span>}</div>
                  <span>{test.questionCount} {test.questionCount === 1 ? "question" : "questions"}</span>
                  <span>{formatDuration(test.durationMinutes)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {loading && <div className="home-storage-loading"><LoadingState label="Loading your tests" /></div>}
      </main>
    </div>
  );
}
