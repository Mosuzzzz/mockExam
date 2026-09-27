import { SignIn } from "@clerk/react";
import { ArrowRight, Check, Clock3, FileJson2, ListChecks } from "lucide-react";

const previewOptions = [
  "A unique identifier for a row",
  "A label for the database",
  "A connection to the server",
  "A command that sorts results",
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="brand-lockup" href="/" aria-label="MockTest home">
          <img className="brand-logo" src="/mocktest.png" alt="MockTest" />
        </a>
        <span className="landing-caption">A clear space to practice</span>
        <a className="btn btn-secondary btn-small landing-sign-in" href="#sign-in">
          Sign in <ArrowRight size={14} aria-hidden="true" />
        </a>
      </header>

      <section className="landing-grid">
        <div className="landing-copy">
          <h1>Bring your questions.<br /><span>Practice like it’s exam day.</span></h1>
          <p className="landing-lead">
            Turn a mock test from any AI tool into a focused, timed exam. Your questions stay yours; MockTest keeps the answers out of sight until you’re done.
          </p>
          <div className="landing-steps" aria-label="How MockTest works">
            <div className="landing-step"><span className="step-mark"><FileJson2 size={18} aria-hidden="true" /></span><span><strong>Bring a test</strong><small>Paste or upload your JSON</small></span><ArrowRight className="step-arrow" size={16} aria-hidden="true" /></div>
            <div className="landing-step"><span className="step-mark"><Clock3 size={18} aria-hidden="true" /></span><span><strong>Take your time</strong><small>Work through a real countdown</small></span><ArrowRight className="step-arrow" size={16} aria-hidden="true" /></div>
            <div className="landing-step"><span className="step-mark"><ListChecks size={18} aria-hidden="true" /></span><span><strong>Learn from the result</strong><small>Review every answer and explanation</small></span><Check className="step-check" size={16} aria-hidden="true" /></div>
          </div>
          <div className="landing-footnote"><span className="footnote-rule" /><span>No AI API required. Use the study tool you already like.</span></div>
        </div>

        <div className="landing-preview" aria-label="Example question in the exam interface">
          <div className="preview-topline"><span>SAMPLE EXAM · DATABASE MIDTERM</span><span className="preview-time"><Clock3 size={14} aria-hidden="true" /> 24:18</span></div>
          <div className="preview-progress"><span /></div>
          <div className="preview-question-meta"><span>QUESTION 04</span><span>3 OF 12 ANSWERED</span></div>
          <h2>What does a primary key do?</h2>
          <div className="preview-options">
            {previewOptions.map((option, index) => <div key={option} className="preview-option"><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option}</span></div>)}
          </div>
          <div className="preview-bottom"><span><span className="preview-dot" /> Answers are saved as you go</span><span className="preview-next">Next <ArrowRight size={14} aria-hidden="true" /></span></div>
          <span className="preview-page-number">04</span>
        </div>
      </section>

      <section className="sign-in-section" id="sign-in">
        <div className="sign-in-intro">
          <h2>Your next practice session starts here.</h2>
          <p>Sign in to save tests, track attempts, and return whenever you’re ready.</p>
        </div>
        <div className="sign-in-card"><SignIn routing="hash" /></div>
      </section>
      <footer className="landing-footer"><span>Questions in. Focus on.</span></footer>
    </main>
  );
}
