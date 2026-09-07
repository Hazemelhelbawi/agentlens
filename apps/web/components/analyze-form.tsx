"use client";

import type { AnalysisResult, AnalyzeStage } from "@agentlens/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AnalysisProgress } from "@/components/analysis-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveReport } from "@/lib/report-store";
import { encodeReportId, friendlyError } from "@/lib/utils";

export function AnalyzeForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("https://example.com");
  const [deep, setDeep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState<AnalyzeStage | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    setStage("connecting");
    try {
      const response = await fetch("/api/analyze/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, pages: deep ? 5 : 0 }),
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(friendlyError(data.error ?? "We couldn't analyze this website."));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reportId: string | null = null;

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
          if (eventName === "stage" && payload.stage) setStage(payload.stage);
          if (eventName === "error") {
            setError(friendlyError(payload.error ?? "We couldn't analyze this website."));
          }
          if (eventName === "result" && payload.id && payload.result) {
            saveReport(payload.id, payload.result);
            reportId = payload.id;
          }
        }
      }

      if (reportId) router.push(`/report/${reportId}`);
    } catch {
      setError("Unable to reach the analyzer.");
    } finally {
      setPending(false);
    }
  }

  let host = url;
  try {
    host = new URL(url).hostname;
  } catch {
    host = url;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          name="url"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          aria-label="Website URL"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={deep}
            onChange={(event) => setDeep(event.target.checked)}
            className="rounded border-line"
          />
          Scan linked same-origin pages (up to 5)
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Analyzing website…" : compact ? "Re-analyze" : "Analyze Website"}
        </Button>
      </form>
      {pending ? <AnalysisProgress current={stage} host={host} /> : null}
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <p className="font-medium">We couldn&apos;t analyze this website.</p>
          <p className="mt-1">Reason: {error}</p>
          <p className="mt-3 text-muted dark:text-red-200/80">
            Try checking the URL, making sure the site is publicly accessible, then retry.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function encodeCurrentUrl(url: string): string {
  return encodeReportId(url);
}
