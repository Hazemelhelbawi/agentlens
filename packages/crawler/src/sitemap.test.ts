import { describe, expect, it } from "vitest";
import { analyzeSitemap, parseSitemapXml } from "./sitemap.js";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc><lastmod>2026-01-01</lastmod></url>
  <url><loc>https://other.com/page</loc></url>
</urlset>`;

describe("sitemap parser", () => {
  it("parses urlset loc and lastmod", () => {
    const parsed = parseSitemapXml(xml, "https://example.com/");
    expect(parsed.validXml).toBe(true);
    expect(parsed.urls).toHaveLength(2);
    expect(parsed.urls[0]?.lastmod).toBe("2026-01-01");
  });

  it("counts same-origin URLs", () => {
    const analysis = analyzeSitemap(xml, "https://example.com/", {
      declaredInRobots: true,
    });
    expect(analysis.urlCount).toBe(2);
    expect(analysis.sameOriginCount).toBe(1);
    expect(analysis.lastmodCount).toBe(1);
    expect(analysis.declaredInRobots).toBe(true);
  });

  it("handles missing sitemaps", () => {
    const analysis = analyzeSitemap(null, "https://example.com/", {
      statusCode: 404,
      declaredInRobots: false,
    });
    expect(analysis.fetched).toBe(false);
    expect(analysis.validXml).toBe(false);
  });

  it("flags invalid documents", () => {
    const parsed = parseSitemapXml("<html>nope</html>", "https://example.com/");
    expect(parsed.validXml).toBe(false);
  });
});
