import type { AnalyzerContext, AnalyzerRule } from "../types.js";
import { finding } from "../types.js";

export const llmsTxtRule: AnalyzerRule = {
  id: "llms-txt",
  category: "llm-discoverability",
  check(ctx: AnalyzerContext) {
    const file = ctx.crawl.crawler.llmsTxt;
    if (!file.fetched) {
      return [
        finding({
          id: "llms-txt",
          category: "llm-discoverability",
          title: "llms.txt",
          description:
            "No llms.txt detected. This emerging convention can provide an additional machine-readable description of your website. It is not a mandatory standard, and its absence does not mean the site is not AI-ready.",
          severity: "info",
          score: 4,
          maxScore: 10,
          recommendation:
            "Consider adding /llms.txt with a title, short description, and links to important docs.",
        }),
      ];
    }

    let score = 6;
    if (file.hasTitle) score += 1;
    if (file.hasDescription) score += 1;
    if (file.linkCount > 0) score += 2;

    return [
      finding({
        id: "llms-txt",
        category: "llm-discoverability",
        title: "llms.txt",
        description: `/llms.txt was found.${file.hasTitle ? " Title present." : ""} ${
          file.hasDescription ? " Description present." : ""
        } ${file.linkCount} markdown link(s). llms.txt is an emerging convention, not a required standard.`,
        severity: "pass",
        score: Math.min(10, score),
        maxScore: 10,
        evidence: { url: "/llms.txt", value: `${file.linkCount} links` },
      }),
    ];
  },
};

export const llmsFullTxtRule: AnalyzerRule = {
  id: "llms-full-txt",
  category: "llm-discoverability",
  check(ctx: AnalyzerContext) {
    const file = ctx.crawl.crawler.llmsFullTxt;
    if (!file.fetched) {
      return [
        finding({
          id: "llms-full-txt",
          category: "llm-discoverability",
          title: "llms-full.txt",
          description:
            "No llms-full.txt detected. This optional companion file can offer a longer machine-readable summary. It is an emerging convention, not a requirement.",
          severity: "info",
          score: 3,
          maxScore: 5,
        }),
      ];
    }
    return [
      finding({
        id: "llms-full-txt",
        category: "llm-discoverability",
        title: "llms-full.txt",
        description: `/llms-full.txt was found with ${file.linkCount} markdown link(s).`,
        severity: "pass",
        score: 5,
        maxScore: 5,
        evidence: { url: "/llms-full.txt" },
      }),
    ];
  },
};

export const aiCrawlersRule: AnalyzerRule = {
  id: "ai-crawlers",
  category: "llm-discoverability",
  check(ctx: AnalyzerContext) {
    const crawlers = ctx.crawl.crawler.robotsTxt.crawlers;
    const restricted = crawlers.filter((c) => c.status === "restricted");
    const allowed = crawlers.filter((c) => c.status === "allowed");
    const unspecified = crawlers.filter((c) => c.status === "unspecified");

    let score = 8;
    if (restricted.length > 0) score -= Math.min(6, restricted.length * 2);
    if (allowed.length > 0) score += 1;
    score = Math.max(0, Math.min(10, score));

    const lines = crawlers.map((c) => `${c.name}: ${c.detail}`).join(" ");
    return [
      finding({
        id: "ai-crawlers",
        category: "llm-discoverability",
        title: "AI crawler directives",
        description: `${restricted.length} restricted, ${allowed.length} explicitly allowed, ${unspecified.length} unspecified. ${lines} This list of crawler names is not exhaustive. Unspecified does not guarantee access.`,
        severity: restricted.length > 0 ? "warning" : "pass",
        score,
        maxScore: 10,
        recommendation:
          restricted.length > 0
            ? "Review robots.txt groups for AI crawlers if you intend those agents to access public content."
            : undefined,
      }),
    ];
  },
};
