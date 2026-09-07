import type { AnalyzerContext, AnalyzerRule } from "../types.js";
import { finding } from "../types.js";

const GENERIC = new Set(["click here", "submit", "ok", "button", "learn more", "read more", "more"]);

function accessibleName(ctx: AnalyzerContext, el: unknown): string {
  const node = ctx.$(el as never);
  const aria = node.attr("aria-label")?.trim();
  if (aria) return aria;
  if (node.attr("aria-labelledby")?.trim()) return node.attr("aria-labelledby")!.trim();
  const value = node.attr("value")?.trim();
  if (value) return value;
  const title = node.attr("title")?.trim();
  if (title) return title;
  const imgAlt = node.find("img[alt]").first().attr("alt")?.trim();
  if (imgAlt) return imgAlt;
  return node.text().replace(/\s+/g, " ").trim();
}

export const interactiveRule: AnalyzerRule = {
  id: "interactive",
  category: "agent-ux",
  check(ctx: AnalyzerContext) {
    const controls = ctx.$("button, [role='button'], input[type='button'], input[type='submit']");
    const total = controls.length;
    if (total === 0) {
      return [
        finding({
          id: "interactive",
          category: "agent-ux",
          title: "Interactive controls",
          description: "No buttons or button-like controls were found on this page.",
          severity: "info",
          score: 6,
          maxScore: 6,
        }),
      ];
    }

    let unnamed = 0;
    let generic = 0;
    const examples: string[] = [];
    controls.each((_, el) => {
      const name = accessibleName(ctx, el);
      if (!name) {
        unnamed += 1;
        if (examples.length < 4) examples.push("<empty>");
        return;
      }
      if (GENERIC.has(name.toLowerCase())) {
        generic += 1;
        if (examples.length < 4) examples.push(name);
      }
    });

    const issues = unnamed + generic;
    let score = 6;
    if (unnamed > 0) score -= Math.min(4, unnamed);
    if (generic > 0) score -= Math.min(2, generic);
    score = Math.max(0, score);

    return [
      finding({
        id: "interactive",
        category: "agent-ux",
        title: "Interactive controls",
        description:
          issues === 0
            ? `${total} button(s) have an accessible name.`
            : `${issues} of ${total} buttons lack a useful accessible name${
                examples.length ? ` (e.g. ${examples.join(", ")})` : ""
              }. This check uses visible text, value, title, and aria-label.`,
        severity: unnamed > 0 ? "warning" : generic > 0 ? "info" : "pass",
        score,
        maxScore: 6,
        recommendation:
          issues > 0
            ? "Give each button a specific action name, such as “Start free trial”, instead of “Click here” or an icon with no accessible name."
            : undefined,
        evidence: { value: examples.join(", ") || String(total) },
      }),
    ];
  },
};
