import type {
  FileFetchStatus,
  HeadingNode,
  ImageIndex,
  ImageIssue,
  ImageRecord,
  JsonLdBlock,
  LinkIndex,
  LinkIssue,
  LinkRecord,
  RobotsSnapshot,
  SchemaSnapshot,
  SeoCheckStatus,
  SeoSnapshot,
  SitemapSnapshot,
  SitemapUrlEntry,
} from "@agentlens/shared";
import { isSameOrigin, parseSitemapXml } from "@agentlens/crawler";
import type { CrawlResult, PageSnapshot } from "@agentlens/crawler";
import { isGenericLabel } from "./evidence.js";
import { elementPath } from "./inspect.js";
import type { AnalyzerContext } from "./types.js";

const SEO_GENERIC = new Set([
  "click here",
  "here",
  "learn more",
  "read more",
  "more",
  "this",
  "details",
  "link",
  "continue",
]);

const ROBOTS_META_KEYS = [
  "index",
  "follow",
  "noindex",
  "nofollow",
  "noarchive",
  "nosnippet",
  "noimageindex",
  "none",
  "all",
  "notranslate",
  "max-snippet",
  "max-image-preview",
  "max-video-preview",
  "unavailable_after",
];

function ctxOf(page: PageSnapshot, crawl: CrawlResult): AnalyzerContext {
  return { url: page.url, page, crawl, $: page.$ };
}

function originUrl(pageUrl: string, path: string): string | undefined {
  try {
    return new URL(path, pageUrl).href;
  } catch {
    return undefined;
  }
}

function fileStatus(fetched: boolean, statusCode?: number, body?: string | null): FileFetchStatus {
  if (fetched && body) return "found";
  if (statusCode === 404) return "not-found";
  if (statusCode === 0) return "error";
  if (statusCode !== undefined && statusCode >= 400) return "error";
  if (!fetched && statusCode === undefined && !body) return "unknown";
  return "not-found";
}

function locate(ctx: AnalyzerContext, el: unknown): { selector?: string; unique?: boolean } {
  const located = elementPath(ctx, el);
  return located.selector ? located : {};
}

function accessibleName($: PageSnapshot["$"], el: unknown): string {
  const node = $(el as never);
  const aria = node.attr("aria-label")?.trim();
  if (aria) return aria;
  const imgAlt = node.find("img[alt]").first().attr("alt")?.trim();
  if (imgAlt) return imgAlt;
  const title = node.attr("title")?.trim();
  if (title) return title;
  return node.text().replace(/\s+/g, " ").trim();
}

function isSeoGeneric(text: string): boolean {
  return SEO_GENERIC.has(text.replace(/\s+/g, " ").trim().toLowerCase()) || isGenericLabel(text);
}

function schemaName(value: string): string {
  const trimmed = value.trim();
  return trimmed.split("/").pop()?.split(":").pop() || trimmed;
}

function parseUrlParts(href: string): SeoSnapshot["url"] {
  try {
    const parsed = new URL(href);
    return {
      href: parsed.href,
      protocol: parsed.protocol.replace(":", ""),
      https: parsed.protocol === "https:",
      hostname: parsed.hostname,
      pathname: parsed.pathname || "/",
      search: parsed.search || undefined,
    };
  } catch {
    return {
      href,
      protocol: "unknown",
      https: false,
      hostname: href,
      pathname: "/",
    };
  }
}

function titleSnapshot(page: PageSnapshot): SeoSnapshot["title"] {
  const text = page.$("title").first().text().replace(/\s+/g, " ").trim();
  if (!text) {
    return { status: "fail", notes: ["Missing title"], length: 0 };
  }
  const notes: string[] = ["Title exists"];
  let status: SeoCheckStatus = "pass";
  if (text.length > 70) {
    status = "warning";
    notes.push("Title is very long");
  }
  return { value: text, length: text.length, status, notes };
}

function descriptionSnapshot(page: PageSnapshot): SeoSnapshot["description"] {
  const text = page.$('meta[name="description"]').first().attr("content")?.replace(/\s+/g, " ").trim() ?? "";
  if (!page.$('meta[name="description"]').first().length) {
    return { status: "fail", notes: ["Missing description"], length: 0 };
  }
  if (!text) {
    return { value: "", length: 0, status: "fail", notes: ["Empty description"] };
  }
  const notes: string[] = ["Description exists"];
  let status: SeoCheckStatus = "pass";
  if (text.length > 160) {
    status = "warning";
    notes.push("Description is very long");
  }
  return { value: text, length: text.length, status, notes };
}

function canonicalSnapshot(page: PageSnapshot): SeoSnapshot["canonical"] {
  const tags = page.$('link[rel="canonical"]');
  const href = tags.first().attr("href")?.trim();
  const notes: string[] = [];
  if (tags.length === 0) {
    return { count: 0, status: "fail", notes: ["Missing canonical"] };
  }
  if (tags.length > 1) notes.push("Multiple canonical tags exist");
  let absolute: boolean | undefined;
  let matchesCurrent: boolean | undefined;
  if (href) {
    absolute = /^https?:\/\//i.test(href);
    if (!absolute) notes.push("Canonical is not absolute");
    try {
      const resolved = new URL(href, page.finalUrl);
      const current = new URL(page.finalUrl);
      matchesCurrent = resolved.origin === current.origin && resolved.pathname === current.pathname;
      if (!matchesCurrent) notes.push("Canonical does not match the current URL path");
    } catch {
      matchesCurrent = undefined;
      notes.push("Canonical URL could not be parsed");
    }
  }
  const status: SeoCheckStatus =
    tags.length > 1 || !href ? "fail" : absolute === false || matchesCurrent === false ? "warning" : "pass";
  if (status === "pass") notes.unshift("Canonical exists");
  return { href, count: tags.length, absolute, matchesCurrent, status, notes };
}

function robotsMetaSnapshot(page: PageSnapshot): SeoSnapshot["robotsMeta"] {
  const content = page.$('meta[name="robots"]').first().attr("content")?.trim();
  if (!content) return { directives: [] };
  const directives = content
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.split(":")[0]?.trim().toLowerCase() ?? "";
      return ROBOTS_META_KEYS.includes(key);
    });
  return { content, directives };
}

function languageSnapshot(page: PageSnapshot): SeoSnapshot["language"] {
  const value = page.$("html").attr("lang")?.trim();
  if (!value) return { status: "warning", notes: ["html lang is missing"] };
  return { value, status: "pass", notes: ["html lang is present"] };
}

function charsetSnapshot(page: PageSnapshot): SeoSnapshot["charset"] {
  const charset = page.$("meta[charset]").first().attr("charset")?.trim();
  let http: string | undefined;
  page.$("meta[http-equiv]").each((_, el) => {
    if ((page.$(el).attr("http-equiv") ?? "").toLowerCase() === "content-type") {
      http = page.$(el).attr("content")?.trim();
    }
  });
  const fromHttp = http?.match(/charset\s*=\s*([^\s;]+)/i)?.[1];
  const value = charset || fromHttp;
  if (!value) return { status: "info", notes: ["Charset not declared in HTML"] };
  return { value, status: "pass", notes: ["Charset declared in HTML"] };
}

function viewportSnapshot(page: PageSnapshot): SeoSnapshot["viewport"] {
  const value = page.$('meta[name="viewport"]').first().attr("content")?.trim();
  if (!value) return { status: "info", notes: ["Viewport meta is missing"] };
  return { value, status: "pass", notes: ["Viewport meta is present"] };
}

export function buildSeoSnapshot(page: PageSnapshot): SeoSnapshot {
  return {
    url: parseUrlParts(page.finalUrl),
    title: titleSnapshot(page),
    description: descriptionSnapshot(page),
    canonical: canonicalSnapshot(page),
    robotsMeta: robotsMetaSnapshot(page),
    language: languageSnapshot(page),
    charset: charsetSnapshot(page),
    viewport: viewportSnapshot(page),
  };
}

export function buildHeadingInspection(page: PageSnapshot, crawl: CrawlResult): {
  headings: HeadingNode[];
  headingCounts: Record<string, number>;
  headingWarnings: string[];
} {
  const ctx = ctxOf(page, crawl);
  const headings: HeadingNode[] = [];
  const headingCounts: Record<string, number> = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  page.$("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = page.$(el).prop("tagName")?.toLowerCase() ?? "h1";
    const level = Number(tag.slice(1));
    const text = page.$(el).text().replace(/\s+/g, " ").trim();
    const located = locate(ctx, el);
    headings.push({
      level,
      text,
      tag,
      empty: !text,
      selector: located.selector,
      unique: located.unique,
    });
    if (headingCounts[tag] !== undefined) headingCounts[tag] += 1;
  });

  const headingWarnings: string[] = [];
  if ((headingCounts.h1 ?? 0) === 0) headingWarnings.push("Missing H1");
  if ((headingCounts.h1 ?? 0) > 1) headingWarnings.push("Multiple H1");
  if (headings.some((item) => item.empty)) headingWarnings.push("Empty headings");
  let previous = 0;
  for (const heading of headings) {
    if (previous && heading.level > previous + 1) {
      headingWarnings.push("Suspicious heading hierarchy");
      break;
    }
    previous = heading.level;
  }

  return { headings: headings.slice(0, 80), headingCounts, headingWarnings };
}

function relTokens(rel?: string): string[] {
  return (rel ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

export function buildLinkIndex(page: PageSnapshot, crawl: CrawlResult): {
  links: { total: number; descriptive: number; generic: number; empty: number; issues: LinkIssue[] };
  linkIndex: LinkIndex;
} {
  const ctx = ctxOf(page, crawl);
  const issues: LinkIssue[] = [];
  const items: LinkRecord[] = [];
  let generic = 0;
  let empty = 0;
  let internal = 0;
  let external = 0;
  let unknownOrigin = 0;
  let nofollow = 0;
  let sponsored = 0;
  let ugc = 0;
  let javascript = 0;
  let imageOnly = 0;

  const anchors = page.$("a[href]");
  anchors.each((_, el) => {
    const href = page.$(el).attr("href")?.trim() ?? "";
    const rel = page.$(el).attr("rel")?.trim();
    const tokens = relTokens(rel);
    const text = accessibleName(page.$, el);
    const hasImage = page.$(el).find("img").length > 0;
    const located = locate(ctx, el);
    let kind: LinkRecord["kind"] = "ok";
    let origin: boolean | undefined;
    if (/^javascript:/i.test(href)) {
      kind = "javascript";
      javascript += 1;
    } else if (!href || href === "#") {
      kind = "empty";
      empty += 1;
    } else if (!text && hasImage) {
      kind = "image-only";
      imageOnly += 1;
    } else if (!text) {
      kind = "empty";
      empty += 1;
    } else if (isSeoGeneric(text)) {
      kind = "generic";
      generic += 1;
    }

    try {
      if (href && !/^javascript:|^mailto:|^tel:|^#/i.test(href)) {
        origin = isSameOrigin(new URL(href, page.finalUrl).href, page.finalUrl);
      }
    } catch {
      origin = undefined;
    }
    if (origin === true) internal += 1;
    else if (origin === false) external += 1;
    else unknownOrigin += 1;

    const isNofollow = tokens.includes("nofollow");
    const isSponsored = tokens.includes("sponsored");
    const isUgc = tokens.includes("ugc");
    if (isNofollow) nofollow += 1;
    if (isSponsored) sponsored += 1;
    if (isUgc) ugc += 1;

    const record: LinkRecord = {
      href,
      text,
      rel,
      internal: origin,
      nofollow: isNofollow || undefined,
      sponsored: isSponsored || undefined,
      ugc: isUgc || undefined,
      kind,
      selector: located.selector,
      unique: located.unique,
    };
    if (items.length < 50) items.push(record);
    if ((kind === "generic" || kind === "empty") && issues.length < 20) {
      issues.push({
        href,
        text,
        kind,
        rel,
        internal: origin,
        nofollow: isNofollow || undefined,
        sponsored: isSponsored || undefined,
        ugc: isUgc || undefined,
        selector: located.selector,
        unique: located.unique,
      });
    }
  });

  const total = anchors.length;
  return {
    links: {
      total,
      descriptive: Math.max(0, total - generic - empty),
      generic,
      empty,
      issues,
    },
    linkIndex: {
      total,
      internal,
      external,
      unknownOrigin,
      nofollow,
      sponsored,
      ugc,
      generic,
      empty,
      javascript,
      imageOnly,
      items,
    },
  };
}

export function buildImageIndex(page: PageSnapshot, crawl: CrawlResult): {
  images: {
    total: number;
    withAlt: number;
    missingAlt: number;
    emptyAlt: number;
    decorative: number;
    issues: ImageIssue[];
  };
  imageIndex: ImageIndex;
} {
  const ctx = ctxOf(page, crawl);
  const issues: ImageIssue[] = [];
  const items: ImageRecord[] = [];
  let missingAlt = 0;
  let emptyAlt = 0;
  let decorative = 0;
  let withDimensions = 0;
  let lazy = 0;
  let imageLinks = 0;

  const images = page.$("img");
  images.each((_, el) => {
    const node = page.$(el);
    const src = node.attr("src") ?? undefined;
    const alt = node.attr("alt");
    const width = node.attr("width")?.trim();
    const height = node.attr("height")?.trim();
    const loading = node.attr("loading")?.trim();
    const inLink = node.closest("a[href]").length > 0;
    const located = locate(ctx, el);
    let altKind: ImageRecord["altKind"] = "present";
    if (alt === undefined) {
      altKind = "missing";
      missingAlt += 1;
      if (issues.length < 20) {
        issues.push({
          src,
          kind: "missing",
          width,
          height,
          loading,
          inLink,
          selector: located.selector,
          unique: located.unique,
        });
      }
    } else if (alt.trim() === "") {
      altKind = "empty";
      emptyAlt += 1;
      decorative += 1;
    }
    if (width && height) withDimensions += 1;
    if (loading?.toLowerCase() === "lazy") lazy += 1;
    if (inLink) imageLinks += 1;
    if (items.length < 50) {
      items.push({
        src,
        alt: alt === undefined ? undefined : alt,
        altKind,
        width,
        height,
        loading,
        inLink,
        selector: located.selector,
        unique: located.unique,
      });
    }
  });

  return {
    images: {
      total: images.length,
      withAlt: images.length - missingAlt,
      missingAlt,
      emptyAlt,
      decorative,
      issues,
    },
    imageIndex: {
      total: images.length,
      withAlt: images.length - missingAlt,
      missingAlt,
      emptyAlt,
      decorative,
      withDimensions,
      withoutDimensions: images.length - withDimensions,
      lazy,
      imageLinks,
      items,
    },
  };
}

export function buildJsonLd(page: PageSnapshot, crawl: CrawlResult): JsonLdBlock[] {
  const ctx = ctxOf(page, crawl);
  const blocks: JsonLdBlock[] = [];
  page.$('script[type="application/ld+json"]').each((index, el) => {
    const raw = page.$(el).contents().text().trim();
    const located = locate(ctx, el);
    try {
      const parsed: unknown = JSON.parse(raw);
      const types: string[] = [];
      const missing: string[] = [];
      const walk = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        const record = node as Record<string, unknown>;
        if (record["@graph"]) walk(record["@graph"]);
        if (Array.isArray(node)) {
          for (const item of node) walk(item);
          return;
        }
        const type = record["@type"];
        if (typeof type === "string") types.push(schemaName(type));
        if (Array.isArray(type)) {
          for (const item of type) {
            if (typeof item === "string") types.push(schemaName(item));
          }
        }
        if (types.includes("Organization") && record.url === undefined) missing.push("Organization.url");
        if (types.includes("WebSite") && record.name === undefined) missing.push("WebSite.name");
      };
      walk(parsed);
      blocks.push({
        index,
        types: types.length ? [...new Set(types)] : ["untyped"],
        valid: true,
        raw,
        missingFields: [...new Set(missing)],
        selector: located.selector,
        unique: located.unique,
      });
    } catch {
      blocks.push({
        index,
        types: [],
        valid: false,
        raw,
        missingFields: [],
        selector: located.selector,
        unique: located.unique,
      });
    }
  });
  return blocks;
}

export function buildSchemaSnapshot(page: PageSnapshot, jsonLd: JsonLdBlock[]): SchemaSnapshot {
  const types = new Set<string>();
  for (const block of jsonLd) for (const type of block.types) if (type !== "untyped") types.add(type);

  let microdataCount = 0;
  page.$("[itemscope]").each((_, el) => {
    microdataCount += 1;
    const itemtype = page.$(el).attr("itemtype");
    if (itemtype) {
      for (const part of itemtype.split(/\s+/)) types.add(schemaName(part));
    }
  });

  let rdfaCount = 0;
  page.$("[typeof], [vocab]").each((_, el) => {
    rdfaCount += 1;
    const typeofValue = page.$(el).attr("typeof");
    if (typeofValue) {
      for (const part of typeofValue.split(/\s+/)) types.add(schemaName(part));
    }
  });

  return {
    jsonLdCount: jsonLd.length,
    microdataCount,
    rdfaCount,
    types: [...types],
  };
}

export function buildSitemapSnapshot(
  crawl: CrawlResult,
  pageUrl: string,
  canonicalHref?: string,
): { sitemapUrls: SitemapUrlEntry[]; sitemapMeta: SitemapSnapshot } {
  const body = crawl.sitemapBody;
  const status = fileStatus(Boolean(body), crawl.crawler.sitemap.statusCode, body);
  const declared = crawl.crawler.robotsTxt.sitemaps[0];
  const url = declared || originUrl(pageUrl, "/sitemap.xml");
  if (!body) {
    return {
      sitemapUrls: [],
      sitemapMeta: {
        status,
        url,
        urlCount: 0,
        childSitemaps: [],
        duplicateCount: 0,
        missingLocCount: 0,
        invalidUrlCount: 0,
      },
    };
  }

  const parsed = parseSitemapXml(body, pageUrl);
  const seen = new Set<string>();
  let duplicateCount = 0;
  let invalidUrlCount = 0;
  for (const entry of parsed.urls) {
    if (seen.has(entry.loc)) duplicateCount += 1;
    seen.add(entry.loc);
    try {
      new URL(entry.loc);
    } catch {
      invalidUrlCount += 1;
    }
  }
  const missingLocCount = parsed.parseErrors.filter((item) => item.includes("Empty <loc>")).length;
  const sitemapUrls = parsed.urls.slice(0, 80).map((entry) => ({
    loc: entry.loc,
    lastmod: entry.lastmod,
    sameOrigin: isSameOrigin(entry.loc, pageUrl),
  }));
  let canonicalInSitemap: boolean | undefined;
  if (canonicalHref) {
    try {
      const canonical = new URL(canonicalHref, pageUrl).href;
      canonicalInSitemap = parsed.urls.some((entry) => {
        try {
          return new URL(entry.loc).href === canonical;
        } catch {
          return entry.loc === canonicalHref;
        }
      });
    } catch {
      canonicalInSitemap = undefined;
    }
  }

  return {
    sitemapUrls,
    sitemapMeta: {
      status: parsed.validXml ? status : status === "found" ? "error" : status,
      url,
      isIndex: parsed.isIndex,
      urlCount: parsed.urls.length,
      childSitemaps: parsed.isIndex ? parsed.urls.map((entry) => entry.loc) : [],
      duplicateCount,
      missingLocCount,
      invalidUrlCount,
      canonicalInSitemap,
    },
  };
}

export function buildRobotsDetail(crawl: CrawlResult, pageUrl: string): RobotsSnapshot {
  return {
    status: fileStatus(Boolean(crawl.robotsBody), crawl.crawler.robotsTxt.statusCode, crawl.robotsBody),
    url: originUrl(pageUrl, "/robots.txt"),
    host: crawl.crawler.robotsTxt.host ?? [],
    otherDirectives: crawl.crawler.robotsTxt.otherDirectives ?? [],
  };
}
