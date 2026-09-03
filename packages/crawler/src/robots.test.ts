import { describe, expect, it } from "vitest";
import { analyzeRobotsTxt, isPathAllowed, parseRobotsTxt } from "./robots.js";

const sample = `User-agent: *
Disallow: /admin
Allow: /
Sitemap: https://example.com/sitemap.xml

User-agent: GPTBot
Disallow: /
`;

describe("robots.txt parser", () => {
  it("parses groups, allow, disallow, and sitemaps", () => {
    const parsed = parseRobotsTxt(sample);
    expect(parsed.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
    expect(parsed.groups).toHaveLength(2);
    expect(parsed.groups[0]?.userAgents).toEqual(["*"]);
    expect(parsed.groups[0]?.disallow).toContain("/admin");
  });

  it("records syntax issues without throwing", () => {
    const parsed = parseRobotsTxt("this is not a directive\nAllow: /oops\n");
    expect(parsed.parseErrors.length).toBeGreaterThan(0);
  });

  it("allows paths using longest-match rules", () => {
    const { groups } = parseRobotsTxt(sample);
    expect(isPathAllowed(groups, "AgentLens", "/docs")).toBe(true);
    expect(isPathAllowed(groups, "AgentLens", "/admin/secret")).toBe(false);
    expect(isPathAllowed(groups, "GPTBot", "/")).toBe(false);
  });

  it("marks unspecified AI crawlers without claiming access", () => {
    const analysis = analyzeRobotsTxt("User-agent: *\nAllow: /\n");
    const gpt = analysis.crawlers.find((c) => c.name === "GPTBot");
    expect(gpt?.status).toBe("unspecified");
    expect(gpt?.detail).toBe("No explicit restriction detected");
  });

  it("detects explicit GPTBot blocks", () => {
    const analysis = analyzeRobotsTxt(sample);
    const gpt = analysis.crawlers.find((c) => c.name === "GPTBot");
    expect(gpt?.status).toBe("restricted");
  });
});
