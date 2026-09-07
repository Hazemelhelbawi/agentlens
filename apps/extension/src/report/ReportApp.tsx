import type { AnalysisResult } from "@agentlens/shared";
import { GRADE_LABELS } from "@agentlens/shared";
import { useEffect, useState } from "react";
import { IssueCard } from "../components/issue-card.js";
import { ScoreRing } from "../components/score-ring.js";
import { downloadText, exportJson, exportMarkdown } from "../lib/export.js";
import type { BackgroundToPopup } from "../lib/messages.js";

export function ReportApp() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void chrome.runtime.sendMessage({ type: "GET_LAST_RESULT" }, (response: BackgroundToPopup) => {
      if (response?.type === "LAST_RESULT" && response.result) setResult(response.result);
      else setError("No analysis is cached. Open AgentLens on a page first.");
    });
  }, []);

  if (error) {
    return (
      <div className="report-shell">
        <h1>AgentLens</h1>
        <p>{error}</p>
      </div>
    );
  }
  if (!result) return <div className="report-shell">Loading report…</div>;

  return (
    <div className="report-shell">
      <p className="kicker">Full report</p>
      <div className="hero">
        <ScoreRing score={result.score} grade={result.grade} />
        <div>
          <h1 className="h1">
            {result.score}/100 · {GRADE_LABELS[result.grade]}
          </h1>
          <p className="host">{result.url}</p>
          <p className="muted">{result.insights?.summary}</p>
        </div>
      </div>
      <div className="actions" style={{ margin: "16px 0" }}>
        <button type="button" className="btn btn-sm" onClick={() => downloadText("agentlens.json", exportJson(result), "application/json")}>
          Export JSON
        </button>
        <button type="button" className="btn btn-sm" onClick={() => downloadText("agentlens.md", exportMarkdown(result), "text/markdown")}>
          Export Markdown
        </button>
      </div>
      <section className="card stack">
        {(result.breakdown ?? []).map((row) => (
          <details key={row.id}>
            <summary>
              {row.name} · {row.score}/100 · {row.points} points
            </summary>
            <ul>
              {row.checks.map((check) => (
                <li key={check.id}>
                  {check.title}: {check.score}/{check.maxScore} ({check.severity})
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
      <h2>Findings</h2>
      <div className="stack">
        {result.findings.map((finding) => (
          <IssueCard
            key={finding.id}
            finding={finding}
            detailed
            onInspect={() => {
              const unique = (finding.inspectTargets ?? []).filter((item) => item.unique);
              void chrome.runtime.sendMessage({
                type: "INSPECT",
                payload: {
                  title: finding.title,
                  description: finding.description,
                  why: finding.whyItMatters,
                  detected: unique[0]?.text ?? finding.detectedSnippet,
                  fix: finding.recommendedFix,
                  selector: unique[0]?.selector,
                  targets: unique,
                },
              });
            }}
          />
        ))}
      </div>
      <p className="muted" style={{ marginTop: 24 }}>
        AgentLens uses deterministic technical checks. It is not an official score from Google, OpenAI, Anthropic, or
        any other provider.
      </p>
    </div>
  );
}
