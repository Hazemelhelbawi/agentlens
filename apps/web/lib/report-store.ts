import type { AnalysisResult } from "@agentlens/shared";

const PREFIX = "agentlens:report:";

export function saveReport(id: string, result: AnalysisResult): void {
  try {
    sessionStorage.setItem(`${PREFIX}${id}`, JSON.stringify(result));
    const prev = sessionStorage.getItem(`${PREFIX}prev:${result.url}`);
    if (prev) sessionStorage.setItem(`${PREFIX}compare:${id}`, prev);
    sessionStorage.setItem(`${PREFIX}prev:${result.url}`, JSON.stringify(result));
  } catch {
    // sessionStorage may be unavailable
  }
}

export function loadReport(id: string): AnalysisResult | null {
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${id}`);
    return raw ? (JSON.parse(raw) as AnalysisResult) : null;
  } catch {
    return null;
  }
}

export function loadComparison(id: string): AnalysisResult | null {
  try {
    const raw = sessionStorage.getItem(`${PREFIX}compare:${id}`);
    return raw ? (JSON.parse(raw) as AnalysisResult) : null;
  } catch {
    return null;
  }
}
