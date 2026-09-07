"use client";

import type { Finding } from "@agentlens/shared";
import { CATEGORY_META } from "@agentlens/shared";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SEVERITY_META } from "@/lib/severity";
import { cn } from "@/lib/utils";

export function FindingCard({
  finding,
  detailed,
  defaultOpen = false,
}: {
  finding: Finding;
  detailed: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const meta = SEVERITY_META[finding.severity];
  const category = CATEGORY_META[finding.category];

  async function copyFix() {
    if (!finding.recommendedFix) return;
    await navigator.clipboard.writeText(finding.recommendedFix);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className="rounded-xl border border-line bg-raised shadow-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-expanded={open}
      >
        <span>
          <span className={cn("inline-flex items-center gap-2 text-xs font-medium", meta.className)}>
            <span aria-hidden>{meta.icon}</span>
            {meta.label}
          </span>
          <span className="mt-1 block font-medium">{finding.title}</span>
          <span className="mt-1 block text-sm text-muted">{finding.description}</span>
        </span>
        <span className="shrink-0 text-xs text-muted">{category.name}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-line px-4 py-4 text-sm">
          {finding.whyItMatters ? (
            <section>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted">Why it matters</h4>
              <p className="mt-1">{finding.whyItMatters}</p>
            </section>
          ) : null}

          <section>
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted">Detected</h4>
            <p className="mt-1">{finding.description}</p>
            {finding.detectedSnippet ? (
              <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-canvas p-3 font-mono text-xs">
                {finding.detectedSnippet}
              </pre>
            ) : null}
          </section>

          <section>
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted">Location</h4>
            <p className="mt-1 font-mono text-xs">
              {finding.evidence?.location ?? "Homepage HTML"}
              {finding.evidence?.line ? ` · Line ${finding.evidence.line}` : ""}
            </p>
            {finding.evidence?.precision === "document" || !finding.evidence?.line ? (
              <p className="mt-1 text-xs text-muted">Exact source line is only shown when AgentLens can uniquely locate the snippet.</p>
            ) : null}
          </section>

          {finding.recommendedFix ? (
            <section>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted">Recommended fix</h4>
                <Button type="button" size="sm" variant="outline" onClick={copyFix}>
                  {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy fix"}
                </Button>
              </div>
              <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-canvas p-3 font-mono text-xs">
                {finding.recommendedFix}
              </pre>
            </section>
          ) : null}

          {finding.affectedPages && finding.affectedPages.length > 0 ? (
            <section>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted">Affected URLs</h4>
              <ul className="mt-1 space-y-1 font-mono text-xs">
                {finding.affectedPages.map((page) => (
                  <li key={page}>{page}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {detailed ? (
            <section className="rounded-md border border-dashed border-line p-3 text-xs text-muted">
              <p>
                Rule ID: <span className="font-mono text-ink">{finding.id}</span>
              </p>
              <p className="mt-1">
                Score: {finding.score} / {finding.maxScore}
                {finding.scoreImpact ? ` · Projected impact +${finding.scoreImpact}` : ""}
              </p>
              {finding.evidence?.selector ? <p className="mt-1">Selector: {finding.evidence.selector}</p> : null}
              {finding.evidence?.source ? <p className="mt-1">Source: {finding.evidence.source}</p> : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
