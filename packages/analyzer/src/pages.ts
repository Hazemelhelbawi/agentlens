import type { Finding } from "@agentlens/shared";
import type { CrawlResult, PageSnapshot } from "@agentlens/crawler";
import { isGenericLabel } from "./evidence.js";

function pageHasIssue(id: string, page: PageSnapshot): boolean {
  switch (id) {
    case "canonical":
      return !page.$('link[rel="canonical"]').attr("href")?.trim();
    case "title":
      return !page.$("title").first().text().trim();
    case "description":
      return !page.$('meta[name="description"]').attr("content")?.trim();
    case "json-ld":
      return page.$('script[type="application/ld+json"]').length === 0;
    case "headings":
      return page.$("h1").length !== 1;
    case "images-alt":
      return page.$("img").toArray().some((el) => page.$(el).attr("alt") === undefined);
    case "links": {
      let generic = 0;
      const anchors = page.$("a[href]");
      anchors.each((_, el) => {
        const text = (page.$(el).attr("aria-label") ?? page.$(el).text()).replace(/\s+/g, " ").trim();
        if (isGenericLabel(text)) generic += 1;
      });
      return anchors.length > 0 && generic / anchors.length > 0.1;
    }
    case "viewport":
      return !page.$('meta[name="viewport"]').attr("content")?.trim();
    case "open-graph":
      return !page.$('meta[property="og:title"]').attr("content")?.trim();
    case "https":
      return !page.finalUrl.startsWith("https://");
    default:
      return false;
  }
}

export function attachAffectedPages(findings: Finding[], crawl: CrawlResult): Finding[] {
  const homepage = crawl.homepage.finalUrl;
  if (crawl.extraPages.length === 0) {
    return findings.map((finding) => ({
      ...finding,
      affectedPages: finding.affectedPages ?? [homepage],
    }));
  }

  return findings.map((finding) => {
    const extras = crawl.extraPages
      .filter((page) => pageHasIssue(finding.id, page))
      .map((page) => page.finalUrl);
    const unique = [...new Set([homepage, ...extras])];
    return { ...finding, affectedPages: unique };
  });
}
