import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import * as core from "@actions/core";
import type { AnalysisResult, Finding } from "@agentlens/shared";

function walkHtmlFiles(root: string, maxFiles = 200): string[] {
  const out: string[] = [];

  const visit = (dir: string) => {
    if (out.length >= maxFiles) return;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git" || entry === "dist" || entry === ".next") {
        continue;
      }
      const full = join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) visit(full);
      else if (/\.(html?|jsx?|tsx?|mdx?|vue|svelte)$/i.test(entry)) out.push(full);
      if (out.length >= maxFiles) return;
    }
  };

  visit(root);
  return out;
}

function lineOfMatch(content: string, needle: string): number | null {
  const index = content.indexOf(needle);
  if (index < 0) return null;
  return content.slice(0, index).split(/\r?\n/).length;
}

function annotationForFinding(
  workspace: string,
  files: string[],
  finding: Finding,
): { path: string; startLine: number; message: string } | null {
  const needle = finding.evidence?.value || finding.evidence?.selector;
  if (!needle || needle.length < 4) return null;
  if (needle.startsWith("http://") || needle.startsWith("https://")) return null;
  if (/^\d+$/.test(needle)) return null;

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const line = lineOfMatch(content, needle);
    if (!line) continue;
    return {
      path: relative(workspace, file).replaceAll("\\", "/"),
      startLine: line,
      message: `AgentLens (${finding.category}): ${finding.title}\n\n${finding.description}${
        finding.recommendation ? `\n\n${finding.recommendation}` : ""
      }`,
    };
  }

  return null;
}

export function createAnnotations(result: AnalysisResult, workspace = process.env.GITHUB_WORKSPACE): number {
  if (!workspace || !existsSync(workspace)) {
    core.info("No workspace available — skipping file annotations.");
    return 0;
  }

  const files = walkHtmlFiles(workspace);
  if (files.length === 0) {
    core.info("No source files found to map findings onto.");
    return 0;
  }

  const candidates = result.findings.filter(
    (f) => f.severity === "critical" || f.severity === "warning",
  );

  let count = 0;
  for (const finding of candidates) {
    const mapped = annotationForFinding(workspace, files, finding);
    if (!mapped) continue;
    const fn = finding.severity === "critical" ? core.error : core.warning;
    fn(mapped.message, {
      file: mapped.path,
      startLine: mapped.startLine,
      title: `AgentLens: ${finding.title}`,
    });
    count += 1;
  }

  if (count === 0) {
    core.info("URL-only analysis could not be mapped to repository files — no annotations created.");
  }

  return count;
}
