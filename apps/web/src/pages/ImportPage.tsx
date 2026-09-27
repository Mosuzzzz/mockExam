import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, ChevronDown, Clipboard, Download, FileJson2, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatValidationIssues, mockTestSchema, sampleTest } from "@mocktest/shared";
import { ErrorNotice, SuccessNotice } from "../components/Feedback";
import { generationPrompt } from "../lib/prompt";
import { useApi, errorMessage } from "../lib/useApi";

const MAX_FILE_BYTES = 1_048_576;

export function ImportPage() {
  const api = useApi();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverIssues, setServerIssues] = useState<{ path: string; message: string }[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    if (!raw.trim()) return { test: null, issues: [] as { path: string; message: string }[], syntaxError: "" };
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return { test: null, issues: [] as { path: string; message: string }[], syntaxError: "This isn’t valid JSON yet. Check for a missing comma or quotation mark." };
    }
    const result = mockTestSchema.safeParse(value);
    return result.success
      ? { test: result.data, issues: [] as { path: string; message: string }[], syntaxError: "" }
      : { test: null, issues: formatValidationIssues(result.error.issues), syntaxError: "" };
  }, [raw]);

  const currentIssues = serverIssues.length ? serverIssues : parsed.issues;

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setSaved(false);
    setServerIssues([]);
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Choose a .json file to continue.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("This file is larger than 1 MB. Choose a smaller mock test.");
      event.target.value = "";
      return;
    }
    try {
      setRaw(await file.text());
      setFileName(file.name);
      setTouched(true);
    } catch {
      setError("The file could not be read. Try choosing it again.");
    }
    event.target.value = "";
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    setError("");
    setServerIssues([]);
    if (!parsed.test) return;
    if (new TextEncoder().encode(raw).byteLength > MAX_FILE_BYTES) {
      setError("This test is larger than 1 MB. Remove some content before saving.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/tests", { method: "POST", body: parsed.test });
      setSaved(true);
      window.setTimeout(() => navigate("/dashboard"), 650);
    } catch (reason) {
      setError(errorMessage(reason));
      if (reason && typeof reason === "object" && "details" in reason && Array.isArray(reason.details)) {
        setServerIssues(reason.details as { path: string; message: string }[]);
        setTouched(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generationPrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Clipboard access was blocked. Select and copy the prompt below instead.");
    }
  };

  const downloadSample = () => {
    const file = new Blob([`${JSON.stringify(sampleTest, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mocktest-sample.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setRaw("");
    setFileName("");
    setTouched(false);
    setServerIssues([]);
    setError("");
    setSaved(false);
  };

  return (
    <div className="page-stack import-page">
      <div className="page-heading">
        <div><h1>Import a test</h1><p>Paste MockTest JSON or choose a file. We’ll check its structure before it’s saved.</p></div>
        <button className="btn btn-quiet sample-download" type="button" onClick={downloadSample}><Download size={16} aria-hidden="true" /> Download sample</button>
      </div>

      {error && <ErrorNotice>{error}</ErrorNotice>}
      {saved && <SuccessNotice>Your test is saved. Taking you back to your tests…</SuccessNotice>}

      <div className="import-layout">
        <form className="import-form" onSubmit={save}>
          <div className="import-label-row"><label htmlFor="test-json">MockTest JSON</label><span>Up to 1 MB</span></div>
          <div className={`editor-wrap${touched && (parsed.syntaxError || currentIssues.length) ? " has-errors" : ""}`}>
            <div className="editor-toolbar"><span><FileJson2 size={16} aria-hidden="true" />{fileName || "Paste your test here"}</span><button type="button" className="editor-clear" onClick={reset} disabled={!raw}>Clear</button></div>
            <textarea
              id="test-json"
              className="json-editor"
              value={raw}
              onChange={(event) => { setRaw(event.target.value); setFileName(""); setSaved(false); setServerIssues([]); }}
              onBlur={() => setTouched(true)}
              placeholder={'{\n  "version": "1.0",\n  "title": "My practice test",\n  "duration_minutes": 30,\n  "questions": [ ... ]\n}'}
              spellCheck={false}
              aria-describedby="editor-help"
              aria-invalid={touched && Boolean(parsed.syntaxError || currentIssues.length)}
            />
            <div className="editor-footer" id="editor-help"><span>{raw ? `${new TextEncoder().encode(raw).byteLength.toLocaleString()} bytes` : "Your answers stay hidden during the exam."}</span><label className="file-trigger"><Upload size={15} aria-hidden="true" /> Choose .json<input ref={fileInput} type="file" accept=".json,application/json" onChange={(event) => void onFile(event)} /></label></div>
          </div>

          {touched && parsed.syntaxError && <div className="validation-block validation-error" role="alert"><strong>Check the JSON syntax</strong><span>{parsed.syntaxError}</span></div>}
          {touched && !parsed.syntaxError && currentIssues.length > 0 && <div className="validation-block validation-error" role="alert"><strong>{currentIssues.length} {currentIssues.length === 1 ? "issue" : "issues"} to fix</strong><ul>{currentIssues.slice(0, 8).map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code><span>{issue.message}</span></li>)}</ul>{currentIssues.length > 8 && <span>And {currentIssues.length - 8} more.</span>}</div>}
          {touched && parsed.test && !serverIssues.length && <div className="validation-block validation-success"><Check size={16} aria-hidden="true" /><span>Format looks good. {parsed.test.questions.length} questions · {parsed.test.duration_minutes} minutes</span></div>}

          <div className="import-actions"><button className="btn btn-primary" type="submit" disabled={!parsed.test || saving || saved}>{saving ? "Saving test…" : "Save test"}</button><Link className="btn btn-quiet" to="/dashboard">Cancel</Link><span className="import-security-note">Your JSON is checked again before it’s stored.</span></div>
        </form>

        <aside className="import-guide">
          <section className="guide-section"><h2>What your JSON needs</h2><p>Use the same simple format with any LLM. Every question has four choices and one correct answer.</p><ul className="guide-checklist"><li><Check size={15} aria-hidden="true" /><span>Version <code>1.0</code> and a test title</span></li><li><Check size={15} aria-hidden="true" /><span>1–100 questions with unique IDs</span></li><li><Check size={15} aria-hidden="true" /><span>Four options and an answer index from 0–3</span></li><li><Check size={15} aria-hidden="true" /><span>A duration from 1–180 minutes</span></li></ul></section>
          <details className="prompt-details"><summary><span>Need JSON from an LLM?</span><ChevronDown size={17} aria-hidden="true" /></summary><div className="prompt-content"><p>Copy this prompt into the study tool you already use.</p><button className="btn btn-secondary prompt-copy" type="button" onClick={() => void copyPrompt()}>{copied ? <Check size={15} aria-hidden="true" /> : <Clipboard size={15} aria-hidden="true" />}{copied ? "Copied" : "Copy prompt"}</button><pre>{generationPrompt}</pre></div></details>
          <p className="guide-footnote">MockTest does not generate questions. You control the material you import.</p>
        </aside>
      </div>
    </div>
  );
}
