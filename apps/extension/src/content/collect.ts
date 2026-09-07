import type { CollectedPageInput } from "@agentlens/analyzer";
import type { InspectTarget } from "@agentlens/shared";

const HTML_CAP = 1_500_000;
const GENERIC_LINKS = new Set([
  "click here",
  "read more",
  "learn more",
  "more",
  "here",
  "this",
  "link",
  "continue",
]);
const GENERIC_BUTTONS = new Set(["click here", "submit", "ok", "button", "learn more", "read more", "more"]);

export function uniqueCssPath(el: Element): { selector: string; unique: boolean } {
  if (el.id) {
    const selector = `#${CSS.escape(el.id)}`;
    try {
      if (document.querySelectorAll(selector).length === 1) return { selector, unique: true };
    } catch {
      /* ignore invalid id */
    }
  }

  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1) {
    const current: Element = node;
    const tag = current.tagName.toLowerCase();
    if (tag === "html") {
      parts.unshift("html");
      break;
    }
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const same = Array.from(parent.children).filter((child: Element) => child.tagName === current.tagName);
    const index = same.indexOf(current) + 1;
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
    node = parent;
  }

  const selector = parts.join(" > ");
  let unique = false;
  try {
    unique = document.querySelectorAll(selector).length === 1;
  } catch {
    unique = false;
  }
  return { selector, unique };
}

function target(el: Element, ruleId: string): InspectTarget {
  const located = uniqueCssPath(el);
  return {
    ruleId,
    selector: located.selector,
    unique: located.unique,
    tagName: el.tagName.toLowerCase(),
    text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || undefined,
    snippet: el.outerHTML.slice(0, 240),
    href: el instanceof HTMLAnchorElement ? el.getAttribute("href") ?? undefined : undefined,
  };
}

function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  if (el.getAttribute("aria-labelledby")?.trim()) return el.getAttribute("aria-labelledby")!.trim();
  const value = el.getAttribute("value")?.trim();
  if (value) return value;
  const title = el.getAttribute("title")?.trim();
  if (title) return title;
  const img = el.querySelector("img[alt]");
  if (img?.getAttribute("alt")?.trim()) return img.getAttribute("alt")!.trim();
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function collectLiveTargets(
  limit = 8,
  lists?: {
    links: NodeListOf<Element>;
    images: NodeListOf<Element>;
    fields: NodeListOf<Element>;
    buttons: NodeListOf<Element>;
    jsonLd: NodeListOf<Element>;
  },
): InspectTarget[] {
  const targets: InspectTarget[] = [];
  const push = (item: InspectTarget) => {
    if (targets.filter((existing) => existing.ruleId === item.ruleId).length < limit) {
      targets.push(item);
    }
  };

  const links = lists?.links ?? document.querySelectorAll("a[href]");
  links.forEach((el) => {
    const href = el.getAttribute("href")?.trim() ?? "";
    const name = accessibleName(el);
    if (!href || href === "#" || !name || GENERIC_LINKS.has(name.toLowerCase())) {
      push(target(el, "links"));
    }
  });
  const images = lists?.images ?? document.querySelectorAll("img");
  images.forEach((el) => {
    if (!el.hasAttribute("alt")) push(target(el, "images-alt"));
  });
  const fields = lists?.fields ?? document.querySelectorAll("input, select, textarea");
  fields.forEach((el) => {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;
    const id = el.getAttribute("id");
    const aria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
    const labeled = Boolean(aria) || Boolean(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
    const wrapped = Boolean(el.closest("label"));
    if (!labeled && !wrapped) push(target(el, "forms"));
  });
  const buttons = lists?.buttons ?? document.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']");
  buttons.forEach((el) => {
    const name = accessibleName(el);
    if (!name || GENERIC_BUTTONS.has(name.toLowerCase())) push(target(el, "interactive"));
  });
  const jsonLd = lists?.jsonLd ?? document.querySelectorAll('script[type="application/ld+json"]');
  jsonLd.forEach((el) => push(target(el, "json-ld")));
  const title = document.querySelector("title");
  if (title) push(target(title, "title"));
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) push(target(canonical, "canonical"));
  const description = document.querySelector('meta[name="description"]');
  if (description) push(target(description, "description"));
  return targets;
}

async function fetchOptional(path: string): Promise<{ status: number; body: string | null }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(new URL(path, location.origin).href, {
      signal: controller.signal,
      credentials: "omit",
    });
    const text = await res.text();
    return { status: res.status, body: res.ok ? text.slice(0, HTML_CAP) : null };
  } catch {
    return { status: 0, body: null };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function collectPage(): Promise<CollectedPageInput> {
  const raw = document.documentElement.outerHTML;
  const truncated = raw.length > HTML_CAP;
  const links = document.querySelectorAll("a[href]");
  const buttons = document.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']");
  const images = document.querySelectorAll("img");
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const forms = document.querySelectorAll("form");
  const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
  const fields = document.querySelectorAll("input, select, textarea");
  const inputs = document.querySelectorAll("input:not([type='hidden']), select, textarea");

  const [robots, sitemap, llmsTxt, llmsFullTxt] = await Promise.all([
    fetchOptional("/robots.txt"),
    fetchOptional("/sitemap.xml"),
    fetchOptional("/llms.txt"),
    fetchOptional("/llms-full.txt"),
  ]);

  return {
    url: location.href,
    html: raw.slice(0, HTML_CAP),
    title: document.title,
    language: document.documentElement.lang || undefined,
    truncated,
    robots,
    sitemap,
    llmsTxt,
    llmsFullTxt,
    stats: {
      links: links.length,
      buttons: buttons.length,
      images: images.length,
      headings: headings.length,
      forms: forms.length,
      jsonLd: jsonLd.length,
      inputs: inputs.length,
    },
    inspectTargets: collectLiveTargets(8, { links, images, fields, buttons, jsonLd }),
  };
}
