import type { AnalysisResult } from "@agentlens/shared";
import { GRADE_LABELS } from "@agentlens/shared";

export const REPORT_MARKER = "<!-- agentlens-report -->";

function bar(): string {
  return "━━━━━━━━━━━━━━━━━━━━";
}

export function formatCliReport(result: AnalysisResult, analyzing = false): string {
  const lines: string[] = ["🤖 AgentLens", ""];
  if (analyzing) {
    lines.push(`Analyzing ${result.url}...`, "");
  }

  for (const category of result.categories) {
    const icon = category.score >= 75 ? "✓" : category.score >= 50 ? "⚠" : "✕";
    lines.push(`${icon} ${category.emoji} ${category.name.padEnd(22)} ${category.score}`);
  }

  lines.push("", bar(), "");
  lines.push(`${result.score}/100 — ${GRADE_LABELS[result.grade].toUpperCase()}`);
  lines.push("");
  const recs = result.recommendations.filter((r) => r.severity !== "info").length;
  const infoRecs = result.recommendations.length;
  if (infoRecs === 0) {
    lines.push("No recommendations.");
  } else {
    lines.push(`${infoRecs} recommendation${infoRecs === 1 ? "" : "s"} found.`);
  }
  if (recs === 0 && infoRecs > 0) {
    // keep the count as-is
  }
  return lines.join("\n");
}

export function formatPrComment(result: AnalysisResult, reportUrl?: string): string {
  const recs = result.recommendations.slice(0, 8);
  const warningCount = result.recommendations.filter(
    (r) => r.severity === "critical" || r.severity === "warning",
  ).length;

  const categoryLines = result.categories
    .map((c) => `${c.emoji} ${c.name.padEnd(22)} ${c.score}`)
    .join("\n");

  const recLines =
    recs.length === 0
      ? "No recommendations."
      : recs.map((r) => `• ${r.title}`).join("\n");

  const link = reportUrl ? `\n[View full report](${reportUrl})\n` : "";

  return `${REPORT_MARKER}
🤖 **AgentLens**

**AI Readiness:** ${result.score}/100  
**Grade:** ${GRADE_LABELS[result.grade].toUpperCase()}

This is a **heuristic developer-oriented score**, not an official ranking from OpenAI, Google, Anthropic, or any search engine.

\`\`\`
${bar()}
${categoryLines}
${bar()}
\`\`\`

⚠️ **${warningCount} recommendation${warningCount === 1 ? "" : "s"}**

${recLines}
${link}
`;
}

export function formatJobSummary(result: AnalysisResult): string {
  const critical = result.findings.filter((f) => f.severity === "critical");
  const warnings = result.findings.filter((f) => f.severity === "warning");

  const categoryRows = result.categories
    .map((c) => `| ${c.emoji} ${c.name} | ${c.score} | ${Math.round(c.weight * 100)}% |`)
    .join("\n");

  const recList = result.recommendations
    .slice(0, 12)
    .map((r) => `- **${r.title}:** ${r.description}`)
    .join("\n");

  return `# 🤖 AgentLens

**AI Readiness Score:** ${result.score} / 100  
**Grade:** ${GRADE_LABELS[result.grade]}  
**URL:** ${result.url}

> Heuristic developer-oriented score. Not an official ranking from any AI provider or search engine.

## Categories

| Category | Score | Weight |
| --- | --- | --- |
${categoryRows}

## Critical issues

${critical.length ? critical.map((f) => `- **${f.title}:** ${f.description}`).join("\n") : "_None_"}

## Warnings

${warnings.length ? warnings.map((f) => `- **${f.title}:** ${f.description}`).join("\n") : "_None_"}

## Recommendations

${recList || "_None_"}
`;
}

export function formatFailMessage(score: number, required: number): string {
  return `❌ AgentLens failed\n\nScore: ${score}\nRequired: ${required}`;
}
