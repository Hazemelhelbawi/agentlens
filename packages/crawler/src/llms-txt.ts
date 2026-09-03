import type { LlmsTxtAnalysis } from "@agentlens/shared";

const LINK_RE = /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g;

export function parseLlmsTxt(text: string, path: string, statusCode?: number): LlmsTxtAnalysis {
  const lines = text.split(/\r?\n/);
  const hasTitle = lines.some((line) => /^#\s+\S/.test(line.trim()));
  const hasDescription = lines.some((line) => /^>\s+\S/.test(line.trim()));
  const linkCount = [...text.matchAll(LINK_RE)].length;

  return {
    path,
    fetched: true,
    statusCode,
    hasTitle,
    hasDescription,
    linkCount,
  };
}

export function emptyLlmsTxt(path: string, statusCode?: number): LlmsTxtAnalysis {
  return {
    path,
    fetched: false,
    statusCode,
    hasTitle: false,
    hasDescription: false,
    linkCount: 0,
  };
}
