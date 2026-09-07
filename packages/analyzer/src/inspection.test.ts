import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeRobotsTxt, analyzeSitemap } from "@agentlens/crawler";
import { contextFromHtml } from "./fixture.js";
import { buildInspection } from "./inspection.js";
import { analyzeCollectedPage } from "./snapshot.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures");

function load(name: string): string {
  return readFileSync(join(fixtures, name), "utf8");
}

function inspectHtml(name: string, options?: Parameters<typeof contextFromHtml>[1]) {
  return buildInspection(contextFromHtml(load(name), options).crawl);
}

describe("SEO inspection", () => {
  it("collects title, description, canonical, robots meta, language, charset, and viewport", () => {
    const inspection = inspectHtml("excellent/index.html", { url: "https://example.com/" });
    expect(inspection.seo?.title.status).toBe("pass");
    expect(inspection.seo?.title.length).toBeGreaterThan(0);
    expect(inspection.seo?.description.status).toBe("pass");
    expect(inspection.seo?.canonical.status).toBe("pass");
    expect(inspection.seo?.canonical.absolute).toBe(true);
    expect(inspection.seo?.canonical.matchesCurrent).toBe(true);
    expect(inspection.seo?.robotsMeta.directives).toEqual(expect.arrayContaining(["index", "follow"]));
    expect(inspection.seo?.language.value).toBe("en");
    expect(inspection.seo?.charset.value?.toLowerCase()).toMatch(/utf-8/);
    expect(inspection.seo?.viewport.value).toMatch(/width=device-width/);
    expect(inspection.seo?.url.https).toBe(true);
    expect(inspection.seo?.url.hostname).toBe("example.com");
  });

  it("flags missing and long titles without inventing pixel width", () => {
    const missing = inspectHtml("missing-title/index.html");
    expect(missing.seo?.title.status).toBe("fail");
    expect(missing.seo?.title.value).toBeUndefined();
    const long = inspectHtml("long-title/index.html");
    expect(long.seo?.title.status).toBe("warning");
    expect(long.seo?.title.length).toBeGreaterThan(70);
    expect(JSON.stringify(long.seo?.title)).not.toMatch(/pixel/i);
  });

  it("flags missing description and multiple canonicals", () => {
    expect(inspectHtml("missing-description/index.html").seo?.description.status).toBe("fail");
    const multi = inspectHtml("multiple-canonical/index.html");
    expect(multi.seo?.canonical.count).toBe(2);
    expect(multi.seo?.canonical.status).toBe("fail");
  });

  it("builds a heading tree with measurable warnings", () => {
    const none = inspectHtml("no-h1/index.html");
    expect(none.headingCounts?.h1).toBe(0);
    expect(none.headingWarnings).toContain("Missing H1");
    const many = inspectHtml("multiple-h1/index.html");
    expect(many.headingCounts?.h1).toBe(2);
    expect(many.headingWarnings).toContain("Multiple H1");
    const skip = inspectHtml("bad-heading-hierarchy/index.html");
    expect(skip.headingWarnings).toContain("Suspicious heading hierarchy");
    expect(skip.headings.map((item) => item.tag)).toEqual(["h1", "h4"]);
  });

  it("classifies generic, empty, javascript, and image-only links", () => {
    const generic = inspectHtml("generic-links/index.html");
    expect(generic.linkIndex?.generic).toBeGreaterThan(0);
    const empty = inspectHtml("empty-links/index.html");
    expect(empty.linkIndex?.empty).toBeGreaterThan(0);
    expect(empty.linkIndex?.javascript).toBe(1);
    expect(empty.linkIndex?.imageOnly).toBe(1);
  });

  it("distinguishes missing alt from decorative empty alt", () => {
    const missing = inspectHtml("missing-alt/index.html");
    expect(missing.imageIndex?.missingAlt).toBe(1);
    expect(missing.imageIndex?.emptyAlt).toBe(0);
    expect(missing.imageIndex?.withDimensions).toBe(1);
    const decorative = inspectHtml("decorative-empty-alt/index.html");
    expect(decorative.imageIndex?.emptyAlt).toBe(1);
    expect(decorative.imageIndex?.decorative).toBe(1);
    expect(decorative.imageIndex?.missingAlt).toBe(0);
  });

  it("keeps malformed JSON-LD and detects schema types", () => {
    const good = inspectHtml("excellent/index.html");
    expect(good.schema?.types).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
    expect(good.jsonLd.every((block) => block.valid)).toBe(true);
    const bad = inspectHtml("malformed-jsonld/index.html");
    expect(bad.jsonLd.some((block) => !block.valid)).toBe(true);
    expect(bad.jsonLd.find((block) => !block.valid)?.raw.length).toBeGreaterThan(0);
  });

  it("parses sitemap indexes and malformed sitemaps without crawling children", async () => {
    const index = await analyzeCollectedPage({
      url: "https://example.com/",
      html: load("excellent/index.html"),
      sitemap: { status: 200, body: load("sitemap-index/sitemap.xml") },
    });
    expect(index.inspection?.sitemapMeta?.isIndex).toBe(true);
    expect(index.inspection?.sitemapMeta?.childSitemaps).toHaveLength(3);
    expect(index.inspection?.sitemapMeta?.urlCount).toBe(3);
    expect(index.inspection?.sitemapUrls[0]?.lastmod).toBe("2026-01-01");

    const malformed = await analyzeCollectedPage({
      url: "https://example.com/",
      html: load("excellent/index.html"),
      sitemap: { status: 200, body: load("malformed-sitemap/sitemap.xml") },
    });
    expect(malformed.inspection?.sitemapMeta?.status).toBe("error");
    expect(malformed.crawler.sitemap.validXml).toBe(false);
  });

  it("records robots status and Host without claiming unspecified crawlers are allowed", async () => {
    const result = await analyzeCollectedPage({
      url: "https://example.com/",
      html: load("excellent/index.html"),
      robots: {
        status: 200,
        body: "User-agent: *\nAllow: /\nHost: example.com\nCrawl-delay: 10\n",
      },
    });
    expect(result.inspection?.robotsDetail?.status).toBe("found");
    expect(result.inspection?.robotsDetail?.host).toContain("example.com");
    expect(result.crawler.robotsTxt.otherDirectives?.some((item) => item.field === "crawl-delay")).toBe(true);
    const gpt = result.crawler.robotsTxt.crawlers.find((item) => item.name === "GPTBot");
    expect(gpt?.status).toBe("unspecified");
  });

  it("surfaces llms.txt and llms-full.txt from collected files", async () => {
    const result = await analyzeCollectedPage({
      url: "https://example.com/",
      html: load("excellent/index.html"),
      llmsTxt: { status: 200, body: load("excellent/llms.txt") },
      llmsFullTxt: { status: 200, body: load("excellent/llms-full.txt") },
    });
    expect(result.crawler.llmsTxt.fetched).toBe(true);
    expect(result.crawler.llmsFullTxt.fetched).toBe(true);
    expect(result.inspection?.llmsRaw).toBeTruthy();
    expect(result.inspection?.llmsFullRaw).toBeTruthy();
  });

  it("does not treat a truncated large page as a complete site crawl", async () => {
    const result = await analyzeCollectedPage({
      url: "https://example.com/large",
      html: load("large-dom/index.html"),
      truncated: true,
    });
    expect(result.truncated).toBe(true);
    expect(result.inspection?.linkIndex?.total).toBe(2);
  });
});

describe("shared crawler fixtures used by inspection", () => {
  it("keeps analyzeSitemap and analyzeRobotsTxt available to the inspector", () => {
    const robots = analyzeRobotsTxt(load("blocked-crawlers/robots.txt"), 200);
    expect(robots.crawlers.find((item) => item.name === "GPTBot")?.status).toBe("restricted");
    const sitemap = analyzeSitemap(load("excellent/sitemap.xml"), "https://example.com/", {
      declaredInRobots: true,
      statusCode: 200,
    });
    expect(sitemap.urlCount).toBe(2);
  });
});
