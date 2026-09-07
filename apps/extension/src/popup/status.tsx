import type { CrawlerRuleStatus, FileFetchStatus, SeoCheckStatus } from "@agentlens/shared";

type Status = SeoCheckStatus | FileFetchStatus | CrawlerRuleStatus | "info";

const LABEL: Record<string, string> = {
  pass: "PASS",
  warning: "WARNING",
  fail: "FAIL",
  info: "INFO",
  unknown: "UNKNOWN",
  found: "FOUND",
  "not-found": "NOT FOUND",
  error: "ERROR",
  allowed: "Allowed",
  blocked: "Blocked",
  "no-specific-rule": "No specific rule",
};

const ICON: Record<string, string> = {
  pass: "✓",
  warning: "⚠",
  fail: "❌",
  info: "ℹ",
  unknown: "?",
  found: "✓",
  "not-found": "⚠",
  error: "❌",
  allowed: "✓",
  blocked: "❌",
  "no-specific-rule": "–",
};

const CLASS: Record<string, string> = {
  pass: "sev-pass",
  warning: "sev-warning",
  fail: "sev-critical",
  info: "sev-info",
  unknown: "muted",
  found: "sev-pass",
  "not-found": "sev-warning",
  error: "sev-critical",
  allowed: "sev-pass",
  blocked: "sev-critical",
  "no-specific-rule": "muted",
};

export function StatusMark({ status, label }: { status: Status; label?: string }) {
  const text = label ?? LABEL[status] ?? status;
  return (
    <span className={`status-mark ${CLASS[status] ?? "muted"}`}>
      <span aria-hidden>{ICON[status] ?? ""}</span> {text}
    </span>
  );
}

export function Tip({ label: _label, text }: { label: string; text: string }) {
  return (
    <button type="button" className="tip" title={text} aria-label={text}>
      ?
    </button>
  );
}
