"use client";

import type { AnalysisResult } from "@agentlens/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FindingCard } from "@/components/report/finding-card";
import { ReportLoader } from "@/components/report/report-loader";
import { loadReport } from "@/lib/report-store";
import { SEVERITY_META } from "@/lib/severity";

export function PageDetail({
  reportId,
  siteUrl,
  pageUrl,
}: {
  reportId: string;
  siteUrl: string;
  pageUrl: string;
}) {
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    setResult(loadReport(reportId));
  }, [reportId]);

  if (!result) {
    return <ReportLoader id={reportId} url={siteUrl} />;
  }

  const page = result.inspection?.pages.find((item) => item.url === pageUrl);
  const findings = result.findings.filter((finding) => finding.affectedPages?.includes(pageUrl));
  const critical = findings.filter((f) => f.severity === "critical").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const passed = findings.filter((f) => f.severity === "pass").length;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link href={`/report/${reportId}`} className="text-sm text-muted hover:text-ink">
        ← Back to report
      </Link>
      <header>
        <p className="font-mono text-sm text-muted">{page?.path ?? pageUrl}</p>
        <h1 className="mt-2 text-3xl font-semibold">Page analysis</h1>
        <p className="mt-2 text-sm text-muted">{page?.title ?? "Homepage HTML from this audit"}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2 py-1 ring-1 ${SEVERITY_META.critical.chip}`}>{critical} critical</span>
          <span className={`rounded-full px-2 py-1 ring-1 ${SEVERITY_META.warning.chip}`}>{warnings} warnings</span>
          <span className={`rounded-full px-2 py-1 ring-1 ${SEVERITY_META.pass.chip}`}>{passed} passed</span>
        </div>
      </header>
      <div className="space-y-3">
        {findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} detailed />
        ))}
      </div>
    </main>
  );
}
