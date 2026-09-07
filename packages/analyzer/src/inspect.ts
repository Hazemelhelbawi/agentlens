import type { Finding, InspectTarget } from "@agentlens/shared";
import { clip, isGenericLabel } from "./evidence.js";
import type { AnalyzerContext } from "./types.js";

function isElement(node: unknown): node is { type: "tag"; name: string } {
  return Boolean(node && typeof node === "object" && (node as { type?: string }).type === "tag");
}

function sel(ctx: AnalyzerContext, el: unknown) {
  return ctx.$(el as never);
}

function escapeIdent(value: string): string {
  return value.replace(/([^\w-])/g, "\\$1");
}

export function elementPath(ctx: AnalyzerContext, el: unknown): { selector: string; unique: boolean } {
  const id = sel(ctx, el).attr("id")?.trim();
  if (id) {
    const selector = `#${escapeIdent(id)}`;
    return { selector, unique: ctx.$(selector).length === 1 };
  }

  const parts: string[] = [];
  let node: unknown = el;
  while (isElement(node)) {
    const tag = node.name;
    const parentNode = sel(ctx, node).parent().get(0);
    if (!isElement(parentNode)) {
      parts.unshift(tag);
      break;
    }
    const siblings = sel(ctx, parentNode).children(tag).toArray();
    const index = siblings.indexOf(node as never) + 1;
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
    node = parentNode;
  }

  const selector = parts.join(" > ");
  let unique = false;
  try {
    unique = ctx.$(selector).length === 1;
  } catch {
    unique = false;
  }
  return { selector, unique };
}

function targetFrom(
  ctx: AnalyzerContext,
  el: unknown,
  ruleId: string,
): InspectTarget {
  const located = elementPath(ctx, el);
  const node = sel(ctx, el);
  const text = node.text().replace(/\s+/g, " ").trim().slice(0, 80) || undefined;
  const href = node.attr("href")?.trim();
  return {
    ruleId,
    selector: located.selector,
    unique: located.unique,
    tagName: isElement(el) ? el.name : "element",
    text,
    snippet: clip(node.toString(), 240),
    href,
  };
}

const GENERIC_BUTTONS = new Set(["click here", "submit", "ok", "button", "learn more", "read more"]);

function accessibleName(ctx: AnalyzerContext, el: unknown): string {
  const node = sel(ctx, el);
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

export function collectInspectTargets(ctx: AnalyzerContext, limit = 8): InspectTarget[] {
  const targets: InspectTarget[] = [];
  const push = (item: InspectTarget) => {
    const count = targets.filter((existing) => existing.ruleId === item.ruleId).length;
    if (count < limit) targets.push(item);
  };

  ctx.$("a[href]").each((_, el) => {
    if (!isElement(el)) return;
    const href = ctx.$(el).attr("href")?.trim() ?? "";
    const name = accessibleName(ctx, el);
    if (!href || href === "#" || !name || isGenericLabel(name)) {
      push(targetFrom(ctx, el, "links"));
    }
  });

  ctx.$("img").each((_, el) => {
    if (!isElement(el)) return;
    if (ctx.$(el).attr("alt") === undefined) push(targetFrom(ctx, el, "images-alt"));
  });

  ctx.$("input, select, textarea").each((_, el) => {
    if (!isElement(el)) return;
    const type = (ctx.$(el).attr("type") ?? "text").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;
    const id = ctx.$(el).attr("id");
    const aria = ctx.$(el).attr("aria-label") || ctx.$(el).attr("aria-labelledby");
    const labeled = Boolean(aria) || Boolean(id && ctx.$(`label[for="${id}"]`).length > 0);
    const wrapped = ctx.$(el).closest("label").length > 0;
    if (!labeled && !wrapped) push(targetFrom(ctx, el, "forms"));
  });

  ctx.$("button, [role='button'], input[type='button'], input[type='submit']").each((_, el) => {
    if (!isElement(el)) return;
    const name = accessibleName(ctx, el);
    if (!name || GENERIC_BUTTONS.has(name.toLowerCase())) {
      push(targetFrom(ctx, el, "interactive"));
    }
  });

  ctx.$('script[type="application/ld+json"]').each((_, el) => {
    if (!isElement(el)) return;
    push(targetFrom(ctx, el, "json-ld"));
  });

  const title = ctx.$("title").get(0);
  if (isElement(title)) push(targetFrom(ctx, title, "title"));
  const canonical = ctx.$('link[rel="canonical"]').get(0);
  if (isElement(canonical)) push(targetFrom(ctx, canonical, "canonical"));
  const description = ctx.$('meta[name="description"]').get(0);
  if (isElement(description)) push(targetFrom(ctx, description, "description"));

  return targets;
}

export function attachInspectTargets<T extends Finding>(findings: T[], targets: InspectTarget[]): T[] {
  return findings.map((finding) => {
    const matched = targets.filter((item) => item.ruleId === finding.id);
    if (matched.length === 0) return finding;
    const unique = matched.find((item) => item.unique) ?? matched[0];
    return {
      ...finding,
      inspectTargets: matched,
      evidence: {
        ...finding.evidence,
        selector: finding.evidence?.selector ?? unique?.selector,
        snippet: finding.evidence?.snippet ?? unique?.snippet,
        tagName: unique?.tagName,
        text: unique?.text,
        inspectable: matched.some((item) => item.unique),
        precision: unique?.unique ? "selector" : finding.evidence?.precision,
      },
    };
  });
}

export function mergeInspectTargets(generated: InspectTarget[], live: InspectTarget[]): InspectTarget[] {
  const byKey = new Map<string, InspectTarget>();
  for (const item of generated) {
    byKey.set(`${item.ruleId}:${item.selector}`, item);
  }
  for (const item of live) {
    const key = `${item.ruleId}:${item.selector}`;
    const existing = byKey.get(key);
    if (!existing || item.unique) byKey.set(key, item);
  }
  return [...byKey.values()];
}
