import type { AnalyzerContext, AnalyzerRule } from "../types.js";
import { finding } from "../types.js";

/**
 * Agent UX is a documented heuristic. It does not measure model quality.
 *
 * Formula (max 20):
 *   +4  <nav> present with at least one named link
 *   +3  canonical URL present
 *   +3  JSON-LD present
 *   +3  title + description both present
 *   +3  <main> landmark present
 *   +2  heading outline has exactly one H1
 *   +2  no empty href="#" / unnamed links dominating
 */
export const agentUxRule: AnalyzerRule = {
  id: "agent-ux",
  category: "agent-ux",
  check(ctx: AnalyzerContext) {
    const nav = ctx.$("nav").first();
    const navLinks = nav.find("a[href]");
    const namedNav = navLinks.toArray().filter((el) => ctx.$(el).text().trim().length > 1).length;
    const hasNav = nav.length > 0 && namedNav > 0;
    const canonical = Boolean(ctx.$('link[rel="canonical"]').attr("href")?.trim());
    const jsonLd = ctx.$('script[type="application/ld+json"]').length > 0;
    const title = Boolean(ctx.$("title").first().text().trim());
    const description = Boolean(ctx.$('meta[name="description"]').attr("content")?.trim());
    const hasMain = ctx.$("main").length > 0;
    const h1Count = ctx.$("h1").length;
    const anchors = ctx.$("a[href]");
    let unnamed = 0;
    anchors.each((_, el) => {
      const href = ctx.$(el).attr("href")?.trim() ?? "";
      const name = (ctx.$(el).attr("aria-label") ?? ctx.$(el).text()).replace(/\s+/g, " ").trim();
      if (!href || href === "#" || !name) unnamed += 1;
    });
    const unnamedRatio = anchors.length === 0 ? 0 : unnamed / anchors.length;

    const parts = [
      { ok: hasNav, pts: 4, label: "descriptive navigation" },
      { ok: canonical, pts: 3, label: "canonical URL" },
      { ok: jsonLd, pts: 3, label: "structured data" },
      { ok: title && description, pts: 3, label: "machine-readable metadata" },
      { ok: hasMain, pts: 3, label: "clear page hierarchy (<main>)" },
      { ok: h1Count === 1, pts: 2, label: "single H1" },
      { ok: unnamedRatio <= 0.15, pts: 2, label: "predictable link names" },
    ];

    const score = parts.reduce((sum, p) => sum + (p.ok ? p.pts : 0), 0);
    const missing = parts.filter((p) => !p.ok).map((p) => p.label);

    return [
      finding({
        id: "agent-ux",
        category: "agent-ux",
        title: "Agent UX",
        description: `Heuristic score based on navigation, canonical URLs, structured data, metadata, landmarks, headings, and link names. Passed: ${
          parts.filter((p) => p.ok).length
        }/${parts.length}.${missing.length ? ` Gaps: ${missing.join(", ")}.` : ""} See docs/scoring.md.`,
        severity: score >= 15 ? "pass" : score >= 10 ? "info" : "warning",
        score,
        maxScore: 20,
        recommendation:
          missing.length > 0
            ? `Improve agent UX by addressing: ${missing.join(", ")}.`
            : undefined,
      }),
    ];
  },
};
