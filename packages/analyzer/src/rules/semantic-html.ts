import type { AnalyzerContext, AnalyzerRule } from "../types.js";
import { finding } from "../types.js";

const LANDMARKS = ["header", "nav", "main", "article", "section", "aside", "footer"] as const;

export const headingsRule: AnalyzerRule = {
  id: "headings",
  category: "semantic-html",
  check(ctx: AnalyzerContext) {
    const counts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
    let empty = 0;
    const levels: number[] = [];

    for (let level = 1; level <= 6; level++) {
      ctx.$(`h${level}`).each((_, el) => {
        counts[`h${level}` as keyof typeof counts] += 1;
        levels.push(level);
        if (!ctx.$(el).text().trim()) empty += 1;
      });
    }

    let skipped = false;
    let previous = 0;
    for (const level of levels) {
      if (previous > 0 && level > previous + 1) skipped = true;
      previous = level;
    }

    const h1 = counts.h1;
    let score = 0;
    const maxScore = 12;
    if (h1 === 1) score += 6;
    else if (h1 > 1) score += 3;
    if (!skipped) score += 3;
    if (empty === 0) score += 3;

    let severity: "pass" | "warning" | "info" = "pass";
    let recommendation: string | undefined;
    if (h1 === 0) {
      severity = "warning";
      recommendation = "Add a single H1 that describes the page.";
      score = Math.min(score, 4);
    } else if (h1 > 1 || skipped || empty > 0) {
      severity = "info";
      recommendation = "Use one H1 and a logical H2/H3 hierarchy without empty headings.";
    }

    return [
      finding({
        id: "headings",
        category: "semantic-html",
        title: "Heading hierarchy",
        description: `H1: ${counts.h1}  H2: ${counts.h2}  H3: ${counts.h3}${
          skipped ? " — heading levels skip in the outline." : " — logical heading hierarchy."
        }${empty ? ` ${empty} empty heading(s).` : ""}`,
        severity,
        score,
        maxScore,
        recommendation,
        evidence: {
          value: JSON.stringify({ ...counts, empty, skipped }),
        },
      }),
    ];
  },
};

export const landmarksRule: AnalyzerRule = {
  id: "landmarks",
  category: "semantic-html",
  check(ctx: AnalyzerContext) {
    const present = LANDMARKS.filter((tag) => ctx.$(tag).length > 0);
    const score = Math.round((present.length / LANDMARKS.length) * 10);
    const hasMain = present.includes("main");
    return [
      finding({
        id: "landmarks",
        category: "semantic-html",
        title: "Semantic landmarks",
        description: present.length
          ? `Found ${present.length}/${LANDMARKS.length} landmark elements: ${present.join(", ")}.`
          : "No HTML5 landmark elements (header, nav, main, article, section, aside, footer) were found.",
        severity: hasMain && present.length >= 3 ? "pass" : present.length > 0 ? "info" : "warning",
        score: hasMain ? score : Math.max(0, score - 2),
        maxScore: 10,
        recommendation:
          hasMain && present.length >= 3
            ? undefined
            : "Use landmark elements such as <main>, <nav>, and <header> so agents can identify page regions.",
        evidence: { value: present.join(",") },
      }),
    ];
  },
};

export const imagesRule: AnalyzerRule = {
  id: "images-alt",
  category: "semantic-html",
  check(ctx: AnalyzerContext) {
    const images = ctx.$("img");
    const total = images.length;
    if (total === 0) {
      return [
        finding({
          id: "images-alt",
          category: "semantic-html",
          title: "Image alt text",
          description: "No images were found on this page.",
          severity: "info",
          score: 6,
          maxScore: 6,
        }),
      ];
    }

    let missing = 0;
    images.each((_, el) => {
      const alt = ctx.$(el).attr("alt");
      if (alt === undefined) missing += 1;
    });

    const score = Math.round(((total - missing) / total) * 8);
    return [
      finding({
        id: "images-alt",
        category: "semantic-html",
        title: "Image alt text",
        description:
          missing === 0
            ? `All ${total} image(s) have an alt attribute.`
            : `${missing} of ${total} images are missing an alt attribute. This check only inspects the alt attribute; it does not certify accessibility.`,
        severity: missing === 0 ? "pass" : missing / total > 0.4 ? "warning" : "info",
        score,
        maxScore: 8,
        recommendation:
          missing > 0 ? "Add alt text that describes the image, or alt=\"\" for decorative images." : undefined,
        evidence: { value: `${total - missing}/${total}` },
      }),
    ];
  },
};

export const formsRule: AnalyzerRule = {
  id: "forms",
  category: "semantic-html",
  check(ctx: AnalyzerContext) {
    const forms = ctx.$("form");
    if (forms.length === 0) {
      return [
        finding({
          id: "forms",
          category: "semantic-html",
          title: "Forms",
          description: "No forms were found on this page.",
          severity: "info",
          score: 4,
          maxScore: 4,
        }),
      ];
    }

    let unlabeled = 0;
    let inputs = 0;
    ctx.$("input, select, textarea").each((_, el) => {
      const type = (ctx.$(el).attr("type") ?? "text").toLowerCase();
      if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;
      inputs += 1;
      const id = ctx.$(el).attr("id");
      const aria = ctx.$(el).attr("aria-label") || ctx.$(el).attr("aria-labelledby");
      const hasLabel = Boolean(aria) || Boolean(id && ctx.$(`label[for="${id}"]`).length > 0);
      const wrapped = ctx.$(el).closest("label").length > 0;
      if (!hasLabel && !wrapped) unlabeled += 1;
    });

    if (inputs === 0) {
      return [
        finding({
          id: "forms",
          category: "semantic-html",
          title: "Forms",
          description: `${forms.length} form(s) found with no labeled fields to inspect.`,
          severity: "info",
          score: 3,
          maxScore: 4,
        }),
      ];
    }

    const score = Math.round(((inputs - unlabeled) / inputs) * 4);
    return [
      finding({
        id: "forms",
        category: "semantic-html",
        title: "Forms",
        description:
          unlabeled === 0
            ? `${forms.length} form(s) and ${inputs} field(s) have associated labels.`
            : `${unlabeled} of ${inputs} fields appear unlabeled. This is a heuristic based on label[for], wrapping <label>, and aria-label.`,
        severity: unlabeled === 0 ? "pass" : "warning",
        score,
        maxScore: 4,
        recommendation:
          unlabeled > 0
            ? "Associate each form control with a <label> or an accessible name so agents can submit forms predictably."
            : undefined,
      }),
    ];
  },
};
