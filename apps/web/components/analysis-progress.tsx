"use client";

import { ANALYZE_STAGES, type AnalyzeStage } from "@agentlens/shared";
import { Check, Circle, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalysisProgress({ current, host }: { current: AnalyzeStage | null; host: string }) {
  const currentIndex = current ? ANALYZE_STAGES.findIndex((s) => s.id === current) : 0;

  return (
    <div className="rounded-xl border border-line bg-raised p-5 shadow-card">
      <p className="text-sm text-muted">Analyzing</p>
      <p className="mt-1 break-all font-mono text-sm">{host}</p>
      <ol className="mt-5 space-y-2" aria-live="polite">
        {ANALYZE_STAGES.filter((s) => s.id !== "complete").map((stage, index) => {
          const done = currentIndex > index;
          const active = current === stage.id;
          return (
            <li key={stage.id} className="flex items-center gap-3 text-sm">
              {done ? (
                <Check className="h-4 w-4 text-emerald-500" aria-hidden />
              ) : active ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden />
              ) : (
                <Circle className="h-4 w-4 text-muted/50" aria-hidden />
              )}
              <span className={cn(done && "text-muted", active && "font-medium")}>{stage.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
