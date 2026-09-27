import { ArrowUpRight, CircleHelp, KeyRound } from "lucide-react";

export function SetupPage() {
  return (
    <main className="setup-page">
      <a className="brand-lockup" href="/" aria-label="MockTest home">
        <img className="brand-logo" src="/mocktest.png" alt="MockTest" />
      </a>
      <section className="setup-content">
        <div className="setup-symbol"><KeyRound size={22} aria-hidden="true" /></div>
        <h1>One setup step before you can sign in</h1>
        <p className="lead-copy">
          Add your Clerk publishable key to the project’s root <code>.env</code> file, then restart the web server.
        </p>
        <div className="setup-code"><code>VITE_CLERK_PUBLISHABLE_KEY=pk_test_…</code></div>
        <a className="inline-link" href="https://dashboard.clerk.com/" target="_blank" rel="noreferrer">
          Open the Clerk Dashboard <ArrowUpRight size={15} aria-hidden="true" />
        </a>
        <div className="setup-note"><CircleHelp size={17} aria-hidden="true" /><span>Also add the same publishable key and your secret key to the server settings. Keep the secret server-only.</span></div>
      </section>
      <p className="setup-footer">Questions and answers stay yours. MockTest doesn’t generate or send them to an AI service.</p>
    </main>
  );
}
