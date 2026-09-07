import type { AnalysisResult } from "@agentlens/shared";
import { GRADE_LABELS } from "@agentlens/shared";

export function exportJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportMarkdown(result: AnalysisResult): string {
  const lines = [
    `# AgentLens report`,
    ``,
    `**URL:** ${result.url}`,
    `**Score:** ${result.score}/100 (${GRADE_LABELS[result.grade]})`,
    `**Analyzed:** ${result.timestamp}`,
    ``,
    result.insights?.summary ?? "",
    ``,
    `## Categories`,
    ``,
  ];
  for (const category of result.categories) {
    lines.push(`- ${category.name}: ${category.score}/100 (weight ${Math.round(category.weight * 100)}%)`);
  }
  lines.push(``, `## Findings`, ``);
  for (const finding of result.findings) {
    lines.push(`### ${finding.title} (${finding.severity})`);
    lines.push(finding.description);
    if (finding.evidence?.location) lines.push(`Location: ${finding.evidence.location}`);
    if (finding.recommendation) lines.push(`Recommendation: ${finding.recommendation}`);
    lines.push(``);
  }
  lines.push(`---`);
  lines.push(
    `AgentLens uses deterministic technical checks. It is not an official score from Google, OpenAI, Anthropic, or any other provider.`,
  );
  return lines.join("\n");
}

export function exportHtml(result: AnalysisResult): string {
  const markdown = exportMarkdown(result)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AgentLens ${result.score}/100 — ${result.url}</title>
</head>
<body>
  <pre>${markdown}</pre>
</body>
</html>`;
}

export function downloadText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}
