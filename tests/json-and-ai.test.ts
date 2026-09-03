import { describe, expect, it } from "vitest";
import { createAIProvider, NoneProvider } from "@agentlens/ai";
import { analysisResultSchema } from "@agentlens/shared";
import { scoreFindings } from "@agentlens/scoring";

describe("optional AI layer", () => {
  it("defaults to a no-op provider without an API key", async () => {
    const provider = createAIProvider();
    expect(provider).toBeInstanceOf(NoneProvider);
    const recs = await provider.generateRecommendations({
      url: "https://example.com/",
      timestamp: new Date().toISOString(),
      score: 10,
      grade: "poor",
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
      recommendations: [
        {
          id: "x",
          title: "t",
          description: "d",
          category: "crawlability",
          severity: "warning",
        },
      ],
    });
    expect(recs).toEqual(["d"]);
  });

  it("requires a key for openai", () => {
    expect(() => createAIProvider({ provider: "openai" })).toThrow(/not configured/i);
  });
});

describe("JSON schema", () => {
  it("accepts a scored empty finding set", () => {
    const scored = scoreFindings([]);
    const parsed = analysisResultSchema.parse({
      url: "https://example.com/",
      timestamp: new Date().toISOString(),
      ...scored,
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
    });
    expect(parsed.score).toBe(0);
  });
});
