import { describe, expect, it } from "vitest";
import { formatHuman, formatJson } from "./format.js";
import type { AnalysisResult } from "@agentlens/shared";

const result: AnalysisResult = {
  url: "https://example.com/",
  timestamp: "2026-01-01T00:00:00.000Z",
  score: 82,
  grade: "good",
  categories: [
    { id: "crawlability", name: "Crawlability", emoji: "🕷", score: 92, weight: 0.2 },
  ],
  findings: [],
  technical: {
    https: true,
    statusCode: 200,
    redirectCount: 0,
    finalUrl: "https://example.com/",
    responseTimeMs: 10,
    responseBytes: 12,
  },
  crawler: {
    robotsTxt: { fetched: false, parseErrors: [], groups: [], sitemaps: [], crawlers: [] },
    sitemap: {
      fetched: false,
      validXml: false,
      urlCount: 0,
      sameOriginCount: 0,
      lastmodCount: 0,
      declaredInRobots: false,
      parseErrors: [],
    },
    llmsTxt: { path: "/llms.txt", fetched: false, hasTitle: false, hasDescription: false, linkCount: 0 },
    llmsFullTxt: {
      path: "/llms-full.txt",
      fetched: false,
      hasTitle: false,
      hasDescription: false,
      linkCount: 0,
    },
  },
  recommendations: [
    {
      id: "a",
      title: "Add llms.txt",
      description: "emerging",
      category: "llm-discoverability",
      severity: "info",
    },
  ],
};

describe("CLI formatters", () => {
  it("prints a human report", () => {
    const text = formatHuman(result);
    expect(text).toContain("🤖 AgentLens");
    expect(text).toContain("82/100");
    expect(text).toContain("GOOD");
    expect(text).toContain("recommendation");
  });

  it("prints stable JSON", () => {
    const parsed = JSON.parse(formatJson(result)) as { score: number; grade: string; url: string };
    expect(parsed.score).toBe(82);
    expect(parsed.grade).toBe("good");
    expect(parsed.url).toBe("https://example.com/");
  });
});
