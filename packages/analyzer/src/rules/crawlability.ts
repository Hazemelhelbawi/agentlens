import type { AnalyzerContext, AnalyzerRule } from "../types.js";
import { finding } from "../types.js";

export const httpStatusRule: AnalyzerRule = {
  id: "http-status",
  category: "crawlability",
  check(ctx: AnalyzerContext) {
    const status = ctx.page.statusCode;
    if (status >= 200 && status < 300) {
      return [
        finding({
          id: "http-status",
          category: "crawlability",
          title: "HTTP status",
          description: `The page returned HTTP ${status}.`,
          severity: "pass",
          score: 10,
          maxScore: 10,
          evidence: { value: String(status), url: ctx.page.finalUrl },
        }),
      ];
    }
    if (status >= 300 && status < 400) {
      return [
        finding({
          id: "http-status",
          category: "crawlability",
          title: "HTTP status",
          description: `The page returned HTTP ${status} after following redirects.`,
          severity: "warning",
          score: 6,
          maxScore: 10,
          recommendation: "Serve the canonical page with a 200 status so crawlers can index it directly.",
          evidence: { value: String(status), url: ctx.page.finalUrl },
        }),
      ];
    }
    return [
      finding({
        id: "http-status",
        category: "crawlability",
        title: "HTTP status",
        description: `The page returned HTTP ${status}, which blocks most crawlers.`,
        severity: "critical",
        score: 0,
        maxScore: 10,
        recommendation: "Fix the HTTP status so the URL returns 200 for crawlers.",
        evidence: { value: String(status), url: ctx.page.finalUrl },
      }),
    ];
  },
};

export const httpsRule: AnalyzerRule = {
  id: "https",
  category: "crawlability",
  check(ctx: AnalyzerContext) {
    const https = ctx.page.finalUrl.startsWith("https://");
    return [
      finding({
        id: "https",
        category: "crawlability",
        title: "HTTPS",
        description: https
          ? "The page is served over HTTPS."
          : "The page is served over HTTP. Crawlers and browsers expect TLS.",
        severity: https ? "pass" : "critical",
        score: https ? 8 : 0,
        maxScore: 8,
        recommendation: https ? undefined : "Serve the site over HTTPS and redirect HTTP traffic.",
        evidence: { url: ctx.page.finalUrl },
      }),
    ];
  },
};

export const redirectsRule: AnalyzerRule = {
  id: "redirects",
  category: "crawlability",
  check(ctx: AnalyzerContext) {
    const count = ctx.crawl.technical.redirectCount;
    if (count === 0) {
      return [
        finding({
          id: "redirects",
          category: "crawlability",
          title: "Redirects",
          description: "No redirects were followed to reach the page.",
          severity: "pass",
          score: 6,
          maxScore: 6,
        }),
      ];
    }
    if (count <= 2) {
      return [
        finding({
          id: "redirects",
          category: "crawlability",
          title: "Redirects",
          description: `${count} redirect(s) were followed. Short chains are acceptable.`,
          severity: "info",
          score: 5,
          maxScore: 6,
          evidence: { value: String(count) },
        }),
      ];
    }
    return [
      finding({
        id: "redirects",
        category: "crawlability",
        title: "Redirects",
        description: `${count} redirects were followed. Long chains waste crawl budget.`,
        severity: "warning",
        score: 2,
        maxScore: 6,
        recommendation: "Collapse redirect chains so crawlers land on the canonical URL in one hop.",
        evidence: { value: String(count) },
      }),
    ];
  },
};

export const robotsTxtRule: AnalyzerRule = {
  id: "robots-txt",
  category: "crawlability",
  check(ctx: AnalyzerContext) {
    const robots = ctx.crawl.crawler.robotsTxt;
    if (!robots.fetched) {
      return [
        finding({
          id: "robots-txt",
          category: "crawlability",
          title: "robots.txt",
          description: robots.statusCode
            ? `/robots.txt returned HTTP ${robots.statusCode}.`
            : "/robots.txt was not found.",
          severity: "warning",
          score: 4,
          maxScore: 10,
          recommendation:
            "Publish a robots.txt that declares a sitemap and avoids blocking public content.",
        }),
      ];
    }

    const errors = robots.parseErrors.length;
    if (errors > 0) {
      return [
        finding({
          id: "robots-txt",
          category: "crawlability",
          title: "robots.txt",
          description: `robots.txt was fetched but has ${errors} syntax issue(s).`,
          severity: "warning",
          score: 6,
          maxScore: 10,
          recommendation: "Fix robots.txt syntax so crawlers can parse allow/disallow rules.",
          evidence: { value: robots.parseErrors.join("; "), url: "/robots.txt" },
        }),
      ];
    }

    return [
      finding({
        id: "robots-txt",
        category: "crawlability",
        title: "robots.txt",
        description: `robots.txt parsed successfully with ${robots.groups.length} user-agent group(s) and ${robots.sitemaps.length} sitemap declaration(s).`,
        severity: "pass",
        score: 10,
        maxScore: 10,
        evidence: { url: "/robots.txt" },
      }),
    ];
  },
};

export const sitemapRule: AnalyzerRule = {
  id: "sitemap",
  category: "crawlability",
  check(ctx: AnalyzerContext) {
    const sitemap = ctx.crawl.crawler.sitemap;
    if (!sitemap.fetched) {
      return [
        finding({
          id: "sitemap",
          category: "crawlability",
          title: "sitemap.xml",
          description: sitemap.declaredInRobots
            ? "A sitemap is declared in robots.txt but could not be fetched."
            : "No sitemap.xml was found at /sitemap.xml and none was declared in robots.txt.",
          severity: "warning",
          score: 3,
          maxScore: 10,
          recommendation:
            "Publish a sitemap.xml and declare it in robots.txt so crawlers can discover URLs.",
        }),
      ];
    }

    if (!sitemap.validXml) {
      return [
        finding({
          id: "sitemap",
          category: "crawlability",
          title: "sitemap.xml",
          description: "A sitemap was fetched but is not valid XML urlset/sitemapindex.",
          severity: "warning",
          score: 4,
          maxScore: 10,
          recommendation: "Serve a well-formed XML sitemap with <loc> entries.",
          evidence: { value: sitemap.parseErrors.join("; ") },
        }),
      ];
    }

    const sameOriginRatio =
      sitemap.urlCount === 0 ? 0 : sitemap.sameOriginCount / sitemap.urlCount;
    const score =
      6 +
      (sitemap.urlCount > 0 ? 2 : 0) +
      (sameOriginRatio >= 0.8 ? 1 : 0) +
      (sitemap.declaredInRobots ? 1 : 0);

    return [
      finding({
        id: "sitemap",
        category: "crawlability",
        title: "sitemap.xml",
        description: `Sitemap contains ${sitemap.urlCount} URL(s); ${sitemap.sameOriginCount} are same-origin; ${sitemap.lastmodCount} include lastmod.`,
        severity: "pass",
        score: Math.min(10, score),
        maxScore: 10,
        evidence: { value: String(sitemap.urlCount) },
      }),
    ];
  },
};

export const canonicalRule: AnalyzerRule = {
  id: "canonical",
  category: "crawlability",
  check(ctx: AnalyzerContext) {
    const href = ctx.$('link[rel="canonical"]').first().attr("href")?.trim();
    if (!href) {
      return [
        finding({
          id: "canonical",
          category: "crawlability",
          title: "Canonical URL",
          description: "No canonical link tag was found.",
          severity: "warning",
          score: 3,
          maxScore: 8,
          recommendation: "Add <link rel=\"canonical\"> pointing at the preferred URL for this page.",
          evidence: { selector: 'link[rel="canonical"]' },
        }),
      ];
    }
    return [
      finding({
        id: "canonical",
        category: "crawlability",
        title: "Canonical URL",
        description: "A canonical URL is declared.",
        severity: "pass",
        score: 8,
        maxScore: 8,
        evidence: { selector: 'link[rel="canonical"]', value: href },
      }),
    ];
  },
};

export const indexabilityRule: AnalyzerRule = {
  id: "indexability",
  category: "crawlability",
  check(ctx: AnalyzerContext) {
    const robotsMeta = (
      ctx.$('meta[name="robots"]').attr("content") ??
      ctx.$('meta[name="googlebot"]').attr("content") ??
      ""
    ).toLowerCase();
    const xRobots = (ctx.page.headers["x-robots-tag"] ?? "").toLowerCase();
    const combined = `${robotsMeta} ${xRobots}`;
    const noindex = combined.includes("noindex");
    const none = combined.includes("none");

    if (noindex || none) {
      return [
        finding({
          id: "indexability",
          category: "crawlability",
          title: "Indexability",
          description: "A noindex signal is present (robots meta or X-Robots-Tag).",
          severity: "warning",
          score: 2,
          maxScore: 8,
          recommendation:
            "Remove noindex if this page should be discoverable by search engines and AI crawlers.",
          evidence: { value: combined.trim() },
        }),
      ];
    }

    return [
      finding({
        id: "indexability",
        category: "crawlability",
        title: "Indexability",
        description: "No noindex signal was detected on this page.",
        severity: "pass",
        score: 8,
        maxScore: 8,
      }),
    ];
  },
};
