import type { AnalyzerContext, AnalyzerRule } from "../types.js";
import { finding, visibleText } from "../types.js";

export const titleRule: AnalyzerRule = {
  id: "title",
  category: "content-access",
  check(ctx: AnalyzerContext) {
    const title = ctx.$("title").first().text().trim();
    const length = title.length;
    if (!title) {
      return [
        finding({
          id: "title",
          category: "content-access",
          title: "Title",
          description: "No document title was found.",
          severity: "critical",
          score: 0,
          maxScore: 10,
          recommendation: "Add a descriptive <title> that names the page in plain language.",
          evidence: { selector: "title" },
        }),
      ];
    }
    const inRange = length >= 15 && length <= 70;
    return [
      finding({
        id: "title",
        category: "content-access",
        title: "Title",
        description: `Present — ${length} characters.`,
        severity: inRange ? "pass" : "info",
        score: inRange ? 10 : 7,
        maxScore: 10,
        recommendation: inRange
          ? undefined
          : "Keep titles roughly 15–70 characters so they stay informative and scannable.",
        evidence: { selector: "title", value: title },
      }),
    ];
  },
};

export const descriptionRule: AnalyzerRule = {
  id: "description",
  category: "content-access",
  check(ctx: AnalyzerContext) {
    const description = ctx.$('meta[name="description"]').attr("content")?.trim() ?? "";
    if (!description) {
      return [
        finding({
          id: "description",
          category: "content-access",
          title: "Meta description",
          description: "No meta description was found.",
          severity: "warning",
          score: 3,
          maxScore: 8,
          recommendation: "Add a meta description summarizing the page for crawlers and snippets.",
          evidence: { selector: 'meta[name="description"]' },
        }),
      ];
    }
    const length = description.length;
    const inRange = length >= 50 && length <= 170;
    return [
      finding({
        id: "description",
        category: "content-access",
        title: "Meta description",
        description: `Present — ${length} characters.`,
        severity: inRange ? "pass" : "info",
        score: inRange ? 8 : 6,
        maxScore: 8,
        evidence: { selector: 'meta[name="description"]', value: description },
      }),
    ];
  },
};

export const textContentRule: AnalyzerRule = {
  id: "text-content",
  category: "content-access",
  check(ctx: AnalyzerContext) {
    const text = visibleText(ctx.$);
    const length = text.length;
    if (length >= 400) {
      return [
        finding({
          id: "text-content",
          category: "content-access",
          title: "Visible text",
          description: `The initial HTML includes about ${length} characters of visible text.`,
          severity: "pass",
          score: 12,
          maxScore: 12,
          evidence: { value: String(length) },
        }),
      ];
    }
    if (length >= 80) {
      return [
        finding({
          id: "text-content",
          category: "content-access",
          title: "Visible text",
          description: `The initial HTML includes about ${length} characters of visible text. That is enough for a short page, but thin for most content URLs.`,
          severity: "info",
          score: 8,
          maxScore: 12,
          evidence: { value: String(length) },
        }),
      ];
    }
    return [
      finding({
        id: "text-content",
        category: "content-access",
        title: "Visible text",
        description: `Very little text content was found in the initial HTML (${length} characters).`,
        severity: "warning",
        score: 3,
        maxScore: 12,
        recommendation:
          "Include meaningful content in the first HTML response so non-browser clients can read it without executing JavaScript.",
        evidence: { value: String(length) },
      }),
    ];
  },
};

export const csrDetectionRule: AnalyzerRule = {
  id: "csr-detection",
  category: "content-access",
  check(ctx: AnalyzerContext) {
    const text = visibleText(ctx.$);
    const html = ctx.page.html;
    const emptyRoots = ["#root", "#__next", "#app", "#__nuxt"].filter((sel) => {
      const el = ctx.$(sel).first();
      return el.length > 0 && el.text().trim().length < 40;
    });
    const scriptCount = ctx.$("script").length;
    const looksLikeShell =
      text.length < 80 && (emptyRoots.length > 0 || scriptCount >= 5 || /id=["']root["']/.test(html));

    if (!looksLikeShell) {
      return [
        finding({
          id: "csr-detection",
          category: "content-access",
          title: "Initial HTML content",
          description:
            "The initial HTML appears to contain page content rather than an empty application shell.",
          severity: "pass",
          score: 10,
          maxScore: 10,
        }),
      ];
    }

    return [
      finding({
        id: "csr-detection",
        category: "content-access",
        title: "Initial HTML content",
        description:
          "Potential client-rendered content detected. The first HTML response looks like an application shell with little readable text. This is a heuristic, not a framework judgment — React and Next.js sites can still be highly readable when they ship content in HTML.",
        severity: "warning",
        score: 4,
        maxScore: 10,
        recommendation:
          "Server-render or prerender primary content so fetch-based crawlers and agents see text without running JavaScript.",
        evidence: {
          value: emptyRoots.length > 0 ? `empty root: ${emptyRoots.join(", ")}` : "thin body text",
        },
      }),
    ];
  },
};
