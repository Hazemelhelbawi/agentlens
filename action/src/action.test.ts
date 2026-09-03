import { describe, expect, it } from "vitest";
import { findExistingComment } from "./comment.js";
import { parseInputsFromRecord } from "./inputs.js";
import { formatFailMessage, formatJobSummary, formatPrComment, REPORT_MARKER } from "./format.js";
import { failUnder } from "@agentlens/scoring";
import type { AnalysisResult } from "@agentlens/shared";

const result: AnalysisResult = {
  url: "https://example.com/",
  timestamp: "2026-01-01T00:00:00.000Z",
  score: 82,
  grade: "good",
  categories: [
    { id: "crawlability", name: "Crawlability", emoji: "🕷", score: 92, weight: 0.2 },
    { id: "content-access", name: "Content Access", emoji: "📄", score: 84, weight: 0.15 },
    { id: "semantic-html", name: "Semantic HTML", emoji: "🧱", score: 88, weight: 0.15 },
    { id: "structured-data", name: "Structured Data", emoji: "🏷", score: 91, weight: 0.15 },
    { id: "llm-discoverability", name: "LLM Discoverability", emoji: "🧠", score: 72, weight: 0.1 },
    { id: "agent-ux", name: "Agent UX", emoji: "🔗", score: 79, weight: 0.15 },
    { id: "technical-seo", name: "Technical SEO", emoji: "⚙️", score: 94, weight: 0.1 },
  ],
  findings: [
    {
      id: "llms-txt",
      category: "llm-discoverability",
      title: "llms.txt",
      description: "No llms.txt detected.",
      severity: "warning",
      score: 4,
      maxScore: 10,
      recommendation: "Add llms.txt",
    },
  ],
  technical: {
    https: true,
    statusCode: 200,
    redirectCount: 0,
    finalUrl: "https://example.com/",
    responseTimeMs: 10,
    responseBytes: 100,
  },
  crawler: {
    robotsTxt: {
      fetched: true,
      parseErrors: [],
      groups: [],
      sitemaps: [],
      crawlers: [],
    },
    sitemap: {
      fetched: true,
      validXml: true,
      urlCount: 1,
      sameOriginCount: 1,
      lastmodCount: 0,
      declaredInRobots: true,
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
      id: "llms-txt",
      title: "Missing llms.txt",
      description: "Add llms.txt",
      category: "llm-discoverability",
      severity: "warning",
    },
  ],
};

describe("GitHub Action inputs", () => {
  it("accepts a valid URL with defaults", () => {
    expect(parseInputsFromRecord({ url: "https://example.com" })).toEqual({
      url: "https://example.com",
      failUnder: 0,
      comment: true,
      annotations: true,
      pages: 0,
    });
  });

  it("rejects a missing URL", () => {
    expect(() => parseInputsFromRecord({})).toThrow(/url/i);
  });

  it("rejects malformed fail-under", () => {
    expect(() => parseInputsFromRecord({ url: "https://example.com", "fail-under": "nope" })).toThrow(
      /fail-under/,
    );
  });

  it("parses fail-under and boolean flags", () => {
    const parsed = parseInputsFromRecord({
      url: "https://example.com",
      "fail-under": "75",
      comment: "false",
      annotations: "0",
      pages: "3",
    });
    expect(parsed.failUnder).toBe(75);
    expect(parsed.comment).toBe(false);
    expect(parsed.annotations).toBe(false);
    expect(parsed.pages).toBe(3);
  });
});

describe("fail-under", () => {
  it("succeeds when score is at or above the threshold", () => {
    expect(failUnder(82, 75)).toBe(false);
  });

  it("fails when score is below the threshold", () => {
    expect(failUnder(68, 75)).toBe(true);
    expect(formatFailMessage(68, 75)).toContain("Score: 68");
    expect(formatFailMessage(68, 75)).toContain("Required: 75");
  });
});

describe("PR comment and summary", () => {
  it("includes a stable marker so comments can be updated", () => {
    const body = formatPrComment(result);
    expect(body).toContain(REPORT_MARKER);
    expect(body).toContain("82/100");
    expect(body).toContain("GOOD");
  });

  it("writes a job summary with score, categories, and recommendations", () => {
    const summary = formatJobSummary(result);
    expect(summary).toContain("82 / 100");
    expect(summary).toContain("Crawlability");
    expect(summary).toContain("Critical issues");
    expect(summary).toContain("Warnings");
    expect(summary).toContain("Recommendations");
  });

  it("updates an existing comment instead of creating a duplicate", () => {
    const comments = [
      { id: 1, body: "unrelated" },
      { id: 2, body: `${REPORT_MARKER}\nolder report` },
    ];
    expect(findExistingComment(comments)?.id).toBe(2);
    expect(findExistingComment([{ id: 3, body: "nope" }])).toBeUndefined();
  });
});
