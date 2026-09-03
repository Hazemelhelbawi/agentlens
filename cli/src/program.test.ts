import { describe, expect, it, vi } from "vitest";
import type { AnalysisResult } from "@agentlens/shared";

const result: AnalysisResult = {
  url: "https://example.com/",
  timestamp: "2026-01-01T00:00:00.000Z",
  score: 68,
  grade: "fair",
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

vi.mock("@agentlens/core", () => ({
  analyzeWebsite: vi.fn(async () => result),
  failUnder: (score: number, threshold: number) => score < threshold,
  SsrfError: class SsrfError extends Error {},
}));

describe("CLI executeCli", () => {
  it("returns 1 when the score is below --fail-under", async () => {
    const { executeCli } = await import("./program.js");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const code = await executeCli("https://example.com", { failUnder: "75" });
    expect(code).toBe(1);
    expect(error).toHaveBeenCalled();
    log.mockRestore();
    error.mockRestore();
  });

  it("returns 2 for an invalid URL-less fail-under value", async () => {
    const { executeCli } = await import("./program.js");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const code = await executeCli("https://example.com", { failUnder: "nope" });
    expect(code).toBe(2);
    error.mockRestore();
  });

  it("returns 0 when json output succeeds above the gate", async () => {
    result.score = 90;
    const { executeCli } = await import("./program.js");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const code = await executeCli("https://example.com", { json: true, failUnder: "80" });
    expect(code).toBe(0);
    log.mockRestore();
    result.score = 68;
  });
});
