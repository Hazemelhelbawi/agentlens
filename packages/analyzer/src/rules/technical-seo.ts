import type { AnalyzerContext, AnalyzerRule } from "../types.js";
import { finding } from "../types.js";

export const viewportRule: AnalyzerRule = {
  id: "viewport",
  category: "technical-seo",
  check(ctx: AnalyzerContext) {
    const viewport = ctx.$('meta[name="viewport"]').attr("content")?.trim();
    return [
      finding({
        id: "viewport",
        category: "technical-seo",
        title: "Viewport",
        description: viewport ? "Viewport meta tag is present." : "No viewport meta tag was found.",
        severity: viewport ? "pass" : "info",
        score: viewport ? 4 : 2,
        maxScore: 4,
        recommendation: viewport ? undefined : "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.",
        evidence: viewport ? { selector: 'meta[name="viewport"]', value: viewport } : undefined,
      }),
    ];
  },
};

export const openGraphRule: AnalyzerRule = {
  id: "open-graph",
  category: "technical-seo",
  check(ctx: AnalyzerContext) {
    const title = ctx.$('meta[property="og:title"]').attr("content")?.trim();
    const desc = ctx.$('meta[property="og:description"]').attr("content")?.trim();
    const url = ctx.$('meta[property="og:url"]').attr("content")?.trim();
    const present = [title, desc, url].filter(Boolean).length;
    return [
      finding({
        id: "open-graph",
        category: "technical-seo",
        title: "Open Graph",
        description:
          present === 0
            ? "No Open Graph tags (og:title, og:description, og:url) were found."
            : `Open Graph: ${present}/3 core tags present.`,
        severity: present >= 2 ? "pass" : present === 1 ? "info" : "warning",
        score: present === 0 ? 2 : present * 2,
        maxScore: 6,
        recommendation:
          present < 3 ? "Add og:title, og:description, and og:url for richer unfurls." : undefined,
      }),
    ];
  },
};

export const twitterMetaRule: AnalyzerRule = {
  id: "twitter-meta",
  category: "technical-seo",
  check(ctx: AnalyzerContext) {
    const card = ctx.$('meta[name="twitter:card"]').attr("content")?.trim();
    const title = ctx.$('meta[name="twitter:title"]').attr("content")?.trim();
    const present = Boolean(card || title);
    return [
      finding({
        id: "twitter-meta",
        category: "technical-seo",
        title: "Twitter metadata",
        description: present ? "Twitter/X metadata is present." : "No twitter:card or twitter:title tags were found.",
        severity: present ? "pass" : "info",
        score: present ? 4 : 2,
        maxScore: 4,
      }),
    ];
  },
};

export const robotsMetaRule: AnalyzerRule = {
  id: "robots-meta",
  category: "technical-seo",
  check(ctx: AnalyzerContext) {
    const robots = ctx.$('meta[name="robots"]').attr("content")?.trim();
    return [
      finding({
        id: "robots-meta",
        category: "technical-seo",
        title: "Robots meta",
        description: robots
          ? `Robots meta is set to "${robots}".`
          : "No robots meta tag; crawlers typically default to index, follow.",
        severity: "pass",
        score: 3,
        maxScore: 3,
        evidence: robots ? { selector: 'meta[name="robots"]', value: robots } : undefined,
      }),
    ];
  },
};

export const responseHygieneRule: AnalyzerRule = {
  id: "response-hygiene",
  category: "technical-seo",
  check(ctx: AnalyzerContext) {
    const ms = ctx.crawl.technical.responseTimeMs;
    const bytes = ctx.crawl.technical.responseBytes;
    const contentType = ctx.page.headers["content-type"] ?? "";
    const html = contentType.includes("html") || ctx.page.html.includes("<html");
    let score = 4;
    if (ms > 5000) score -= 2;
    else if (ms > 2000) score -= 1;
    if (bytes > 1_500_000) score -= 1;
    if (!html) score -= 1;
    return [
      finding({
        id: "response-hygiene",
        category: "technical-seo",
        title: "Response hygiene",
        description: `Fetched in ${ms}ms (${bytes} bytes)${html ? ", HTML content type." : "."}`,
        severity: score >= 3 ? "pass" : "info",
        score: Math.max(0, score),
        maxScore: 4,
      }),
    ];
  },
};
