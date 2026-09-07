"use client";

import type { AnalysisResult, AnalyzeStage } from "@agentlens/shared";
import { useEffect, useState } from "react";
import { AnalysisProgress } from "@/components/analysis-progress";
import { ReportView } from "@/components/report/report-view";
import { loadComparison, loadReport, saveReport } from "@/lib/report-store";
import { friendlyError } from "@/lib/utils";

export function ReportLoader({ id, url }: { id: string; url: string }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [previous, setPrevious] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<AnalyzeStage | null>("connecting");

  useEffect(() => {
    const cached = loadReport(id);
    if (cached) {
      setResult(cached);
      setPrevious(loadComparison(id));
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/analyze/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, pages: 0 }),
        });
        if (!response.body) {
          setError("We couldn't analyze this website.");
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const eventLine = part.split("\n").find((line) => line.startsWith("event:"));
            const dataLine = part.split("\n").find((line) => line.startsWith("data:"));
            if (!eventLine || !dataLine) continue;
            const eventName = eventLine.slice(6).trim();
            const payload = JSON.parse(dataLine.slice(5)) as {
              stage?: AnalyzeStage;
              id?: string;
              result?: AnalysisResult;
              error?: string;
            };
            if (cancelled) return;
            if (eventName === "stage" && payload.stage) setStage(payload.stage);
            if (eventName === "error") setError(friendlyError(payload.error ?? "Analysis failed"));
            if (eventName === "result" && payload.id && payload.result) {
              saveReport(payload.id, payload.result);
              setResult(payload.result);
              setPrevious(loadComparison(payload.id));
            }
          }
        }
      } catch {
        if (!cancelled) setError("Unable to reach the analyzer.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, url]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">We couldn&apos;t analyze this website.</h1>
        <p className="mt-3 text-sm text-muted">Reason: {error}</p>
        <p className="mt-4 text-sm text-muted">
          Check the URL, make sure the website is publicly accessible, then try again later.
        </p>
      </main>
    );
  }

  if (!result) {
    let host = url;
    try {
      host = new URL(url).hostname;
    } catch {
      host = url;
    }
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <AnalysisProgress current={stage} host={host} />
      </main>
    );
  }

  return <ReportView result={result} reportId={id} previous={previous} />;
}
