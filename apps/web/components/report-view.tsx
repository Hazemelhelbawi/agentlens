"use client";

import { useState } from "react";
import type { AnalysisResult, Finding } from "@agentlens/shared";
import { GRADE_LABELS } from "@agentlens/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { gradeColor } from "@/lib/utils";

function FindingRow({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-canvas/60"
      >
        <span>
          <span className="font-medium">{finding.title}</span>
          <span className="mt-1 block text-sm text-muted">{finding.description}</span>
        </span>
        <span className="shrink-0 font-mono text-xs uppercase text-muted">{finding.severity}</span>
      </button>
      {open ? (
        <div className="space-y-3 bg-canvas/40 px-4 pb-4 text-sm">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted">Why this matters</p>
            <p>{finding.description}</p>
          </div>
          {finding.evidence ? (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Evidence</p>
              <pre className="overflow-x-auto rounded border border-line bg-canvas p-2 font-mono text-xs">
                {JSON.stringify(finding.evidence, null, 2)}
              </pre>
            </div>
          ) : null}
          {finding.recommendation ? (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Recommendation</p>
              <p>{finding.recommendation}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ReportView({ result, reportId }: { result: AnalysisResult; reportId: string }) {
  const color = gradeColor(result.score);

  async function copyLink() {
    const url = `${window.location.origin}/report/${reportId}`;
    await navigator.clipboard.writeText(url);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `agentlens-${reportId}.json`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">AgentLens report</p>
          <h1 className="mt-1 font-mono text-4xl font-semibold" style={{ color }}>
            {result.score} / 100
          </h1>
          <p className="mt-1 text-lg">{GRADE_LABELS[result.grade].toUpperCase()}</p>
          <p className="mt-2 break-all font-mono text-sm text-muted">{result.url}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyLink}>
            Copy link
          </Button>
          <Button variant="outline" onClick={downloadJson}>
            Download JSON
          </Button>
        </div>
      </header>

      <p className="text-sm text-muted">
        Heuristic developer-oriented score. Not an official ranking from OpenAI, Google, Anthropic,
        or any search engine.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {result.categories.map((category) => (
          <Card key={category.id}>
            <p className="text-sm text-muted">
              {category.emoji} {category.name}
            </p>
            <p className="mt-2 font-mono text-2xl">{category.score}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">Findings</h2>
        <Card className="p-0">
          {result.findings.map((finding) => (
            <FindingRow key={finding.id} finding={finding} />
          ))}
        </Card>
      </section>
    </div>
  );
}
