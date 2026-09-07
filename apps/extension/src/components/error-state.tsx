import type { ExtensionError } from "../lib/messages.js";

export function ErrorState({ error, onRetry }: { error: ExtensionError; onRetry: () => void }) {
  return (
    <div className="error">
      <h2>{error.title}</h2>
      <p>
        <strong>Reason:</strong> {error.reason}
      </p>
      {error.hint ? <p className="muted">{error.hint}</p> : null}
      <button type="button" className="btn btn-primary" onClick={onRetry} style={{ marginTop: 16 }}>
        Try another page
      </button>
    </div>
  );
}
