import type { AnalyzerContext, AnalyzerRule } from "../types.js";
import { finding } from "../types.js";

const GENERIC_LABELS = new Set([
  "click here",
  "read more",
  "learn more",
  "more",
  "here",
  "this",
  "link",
  "continue",
]);

function accessibleName(node: {
  attr: (name: string) => string | undefined;
  text: () => string;
}): string {
  const aria = node.attr("aria-label")?.trim();
  if (aria) return aria;
  const labelledBy = node.attr("aria-labelledby")?.trim();
  if (labelledBy) {
    return labelledBy;
  }
  return node.text().replace(/\s+/g, " ").trim();
}

export const linksRule: AnalyzerRule = {
  id: "links",
  category: "agent-ux",
  check(ctx: AnalyzerContext) {
    const anchors = ctx.$("a[href]");
    const total = anchors.length;
    if (total === 0) {
      return [
        finding({
          id: "links",
          category: "agent-ux",
          title: "Link labels",
          description: "No hyperlinks were found on this page.",
          severity: "info",
          score: 8,
          maxScore: 10,
        }),
      ];
    }

    let empty = 0;
    let generic = 0;
    const genericExamples: string[] = [];

    anchors.each((_, el) => {
      const href = ctx.$(el).attr("href")?.trim() ?? "";
      if (!href || href === "#") empty += 1;
      const name = accessibleName(ctx.$(el));
      if (!name) {
        empty += 1;
        return;
      }
      if (GENERIC_LABELS.has(name.toLowerCase())) {
        generic += 1;
        if (genericExamples.length < 5) genericExamples.push(name);
      }
    });

    const genericRatio = generic / total;
    let score = 10;
    if (empty > 0) score -= Math.min(5, empty);
    if (genericRatio > 0.25) score -= 4;
    else if (genericRatio > 0.1) score -= 2;
    score = Math.max(0, score);

    const bits: string[] = [`${total} links.`];
    if (empty) bits.push(`${empty} empty or unnamed.`);
    if (generic) bits.push(`${generic} generic label(s) such as ${genericExamples.join(", ")}.`);
    bits.push(
      "Descriptive link text gives agents and crawlers destination context; generic phrases are not automatically a failure.",
    );

    return [
      finding({
        id: "links",
        category: "agent-ux",
        title: "Link labels",
        description: bits.join(" "),
        severity: empty > 3 || genericRatio > 0.25 ? "warning" : generic ? "info" : "pass",
        score,
        maxScore: 10,
        recommendation:
          generic || empty
            ? 'Prefer destination-specific labels such as "View pricing plans" instead of "Click here".'
            : undefined,
        evidence: { value: generic ? genericExamples.join(", ") : String(total) },
      }),
    ];
  },
};
