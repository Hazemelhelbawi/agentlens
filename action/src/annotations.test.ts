import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createAnnotations } from "./annotations.js";
import { REPORT_MARKER } from "./format.js";
import type { AnalysisResult } from "@agentlens/shared";

const base: AnalysisResult = {
  url: "https://example.com/",
  timestamp: "2026-01-01T00:00:00.000Z",
  score: 50,
  grade: "needs-work",
  categories: [],
  findings: [],
  technical: {
    https: true,
    statusCode: 200,
    redirectCount: 0,
    finalUrl: "https://example.com/",
    responseTimeMs: 1,
    responseBytes: 1,
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
  recommendations: [],
};

describe("annotations", () => {
  it("does not invent file locations for URL-only evidence", () => {
    const count = createAnnotations({
      ...base,
      findings: [
        {
          id: "title",
          category: "content-access",
          title: "Title",
          description: "Missing",
          severity: "warning",
          score: 0,
          maxScore: 10,
          evidence: { url: "https://example.com/" },
        },
      ],
    }, mkdtempSync(join(tmpdir(), "agentlens-")));
    expect(count).toBe(0);
  });

  it("annotates a repository file when evidence maps safely", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentlens-"));
    writeFileSync(join(dir, "page.html"), '<a href="/pricing">Click here</a>\n');
    const warning = vi.fn();
    vi.doMock("@actions/core", () => ({ warning, info: vi.fn(), error: vi.fn() }));

    const count = createAnnotations(
      {
        ...base,
        findings: [
          {
            id: "links",
            category: "agent-ux",
            title: "Link labels",
            description: "Generic anchor text",
            severity: "warning",
            score: 4,
            maxScore: 10,
            recommendation: 'Consider a descriptive label such as "View pricing plans".',
            evidence: { value: "Click here" },
          },
        ],
      },
      dir,
    );
    expect(count).toBe(1);
  });
});

describe("comment identity", () => {
  it("uses a unique hidden marker", () => {
    expect(REPORT_MARKER).toBe("<!-- agentlens-report -->");
  });
});
