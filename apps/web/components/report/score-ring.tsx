"use client";

import { gradeColor } from "@/lib/utils";
import { gradeLabel } from "@/lib/severity";

export function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = gradeColor(score);

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={`Score ${score} out of 100, ${gradeLabel(score)}`}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" className="text-line" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-mono text-4xl font-semibold" style={{ color }}>
          {score}
        </p>
        <p className="text-xs text-muted">/100</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide">{gradeLabel(score)}</p>
      </div>
    </div>
  );
}
