import type { Finding } from "@agentlens/shared";
import { CATEGORY_META } from "@agentlens/shared";
import { useState } from "react";
import { copyText } from "../lib/copy.js";
import { SEVERITY_META } from "../lib/severity.js";

export function IssueCard({
  finding,
  detailed,
  onInspect,
}: {
  finding: Finding;
  detailed: boolean;
  onInspect: (finding: Finding) => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const meta = SEVERITY_META[finding.severity];
  const uniqueTargets = (finding.inspectTargets ?? []).filter((item) => item.unique);
  const inspectable = uniqueTargets.length > 0;
  const affected = finding.inspectTargets?.length ?? 0;
  const where =
    (finding.evidence?.precision === "line" && finding.evidence.line
      ? `Line ${finding.evidence.line}`
      : undefined) ??
    (finding.evidence?.inspectable && finding.evidence.selector ? finding.evidence.selector : undefined) ??
    finding.evidence?.location ??
    "Evidence unavailable";

  async function copyFix() {
    if (!finding.recommendedFix) return;
    const ok = await copyText(finding.recommendedFix);
    setCopied(ok ? "ok" : "fail");
    window.setTimeout(() => setCopied("idle"), 1200);
  }

  return (
    <article className="issue-wrap">
      <button
        type="button"
        className="issue"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className={meta.className}>
          <span aria-hidden>{meta.icon}</span> {meta.label}
        </span>
        <span className="issue-title">{finding.title}</span>
        <span className="issue-desc">{finding.description}</span>
        <span className="issue-meta">
          {CATEGORY_META[finding.category].name} · {finding.id}
          {affected > 0 ? ` · ${affected} affected` : ""}
        </span>
      </button>
      <div className="actions issue-actions">
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
          View evidence
        </button>
        <button type="button" className="btn btn-sm" onClick={() => onInspect(finding)} disabled={!inspectable}>
          Inspect
        </button>
        {finding.recommendedFix ? (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => void copyFix()}>
            {copied === "ok" ? "Copied" : copied === "fail" ? "Copy failed" : "Copy fix"}
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="detail card">
          <section>
            <h4>What</h4>
            <p>{finding.title}</p>
          </section>
          {finding.whyItMatters ? (
            <section>
              <h4>Why</h4>
              <p>{finding.whyItMatters}</p>
            </section>
          ) : null}
          <section>
            <h4>Where</h4>
            <p>{where}</p>
            {finding.evidence?.precision !== "line" && !inspectable ? (
              <p className="muted">Exact location is only shown when AgentLens can uniquely identify the element.</p>
            ) : null}
          </section>
          {finding.detectedSnippet || finding.evidence?.snippet ? (
            <section>
              <h4>Detected</h4>
              <pre>{finding.detectedSnippet ?? finding.evidence?.snippet}</pre>
            </section>
          ) : (
            <section>
              <h4>Detected</h4>
              <p className="muted">Evidence unavailable</p>
            </section>
          )}
          {finding.recommendedFix ? (
            <section>
              <h4>How</h4>
              <pre>{finding.recommendedFix}</pre>
            </section>
          ) : null}
          {detailed ? (
            <section>
              <h4>Developer details</h4>
              <p>Rule: {finding.id}</p>
              {inspectable && uniqueTargets[0]?.selector ? <p>Selector: {uniqueTargets[0].selector}</p> : null}
              {finding.scoreImpact ? <p>Projected score impact: +{finding.scoreImpact} if this check passes</p> : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
