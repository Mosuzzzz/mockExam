import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <LoaderCircle className="spinner" size={19} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorNotice({
  children,
  onRetry,
}: {
  children: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <div className="notice-copy">{children}</div>
      {onRetry && (
        <button className="btn btn-small btn-quiet" type="button" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

export function SuccessNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice notice-success" role="status">
      <CheckCircle2 size={18} aria-hidden="true" />
      <div className="notice-copy">{children}</div>
    </div>
  );
}
