import type { AnalysisResult } from "@agentlens/shared";
import { GRADE_LABELS } from "@agentlens/shared";

export function formatHuman(result: AnalysisResult): string {
  const lines = [
    "🤖 AgentLens",
    "",
    `Analyzing ${result.url}...`,
    "",
  ];

  for (const category of result.categories) {
    const icon = category.score >= 75 ? "✓" : category.score >= 50 ? "⚠" : "✕";
    lines.push(`${icon} ${category.name.padEnd(22)} ${String(category.score).padStart(3)}`);
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push(`${result.score}/100 — ${GRADE_LABELS[result.grade].toUpperCase()}`);
  lines.push("");
  const n = result.recommendations.length;
  lines.push(
    n === 0 ? "No recommendations found." : `${n} recommendation${n === 1 ? "" : "s"} found.`,
  );

  if (n > 0) {
    lines.push("");
    for (const rec of result.recommendations.slice(0, 8)) {
      lines.push(`• ${rec.title}: ${rec.description}`);
    }
  }

  lines.push("");
  lines.push("Score is a heuristic for developers, not an official ranking.");
  return lines.join("\n");
}

export function formatJson(result: AnalysisResult): string {
  return JSON.stringify(
    {
      url: result.url,
      timestamp: result.timestamp,
      score: result.score,
      grade: result.grade,
      categories: result.categories,
      findings: result.findings,
      recommendations: result.recommendations,
      technical: result.technical,
      crawler: result.crawler,
    },
    null,
    2,
  );
}
