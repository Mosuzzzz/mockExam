import { FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="not-found-icon" aria-hidden="true"><FileQuestion size={22} strokeWidth={1.7} /></div>
      <p className="not-found-code">ERROR 404</p>
      <h1 id="not-found-title">We couldn’t find that page.</h1>
      <p className="not-found-copy">The address may be incorrect, or the page may have moved.</p>
      <Link className="btn btn-primary" to="/dashboard">Go to your tests</Link>
    </section>
  );
}
