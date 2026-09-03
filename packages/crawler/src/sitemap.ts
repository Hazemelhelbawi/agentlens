import { load } from "cheerio";
import type { SitemapAnalysis } from "@agentlens/shared";
import { isSameOrigin } from "./ssrf.js";

export interface ParsedSitemapUrl {
  loc: string;
  lastmod?: string;
}

export function parseSitemapXml(
  xml: string,
  _originUrl: string,
): {
  urls: ParsedSitemapUrl[];
  validXml: boolean;
  parseErrors: string[];
  isIndex: boolean;
} {
  const parseErrors: string[] = [];
  const urls: ParsedSitemapUrl[] = [];

  let $;
  try {
    $ = load(xml, { xml: true });
  } catch {
    return { urls, validXml: false, parseErrors: ["Failed to parse XML"], isIndex: false };
  }

  const urlset = $("urlset");
  const sitemapindex = $("sitemapindex");
  const isIndex = sitemapindex.length > 0;
  const hasUrlset = urlset.length > 0;

  if (!hasUrlset && !isIndex) {
    parseErrors.push("Document is not a urlset or sitemapindex");
  }

  const locNodes = isIndex ? $("sitemap > loc") : $("url > loc");
  locNodes.each((_, el) => {
    const loc = $(el).text().trim();
    if (!loc) {
      parseErrors.push("Empty <loc> entry");
      return;
    }
    const lastmod = $(el).parent().find("lastmod").first().text().trim() || undefined;
    urls.push({ loc, lastmod });
  });

  return {
    urls,
    validXml: parseErrors.length === 0 && (hasUrlset || isIndex),
    parseErrors,
    isIndex,
  };
}

export function analyzeSitemap(
  xml: string | null,
  originUrl: string,
  options: { statusCode?: number; declaredInRobots: boolean },
): SitemapAnalysis {
  if (xml === null) {
    return {
      fetched: false,
      statusCode: options.statusCode,
      validXml: false,
      urlCount: 0,
      sameOriginCount: 0,
      lastmodCount: 0,
      declaredInRobots: options.declaredInRobots,
      parseErrors: [],
    };
  }

  const parsed = parseSitemapXml(xml, originUrl);
  const sameOriginCount = parsed.urls.filter((u) => isSameOrigin(u.loc, originUrl)).length;
  const lastmodCount = parsed.urls.filter((u) => Boolean(u.lastmod)).length;

  return {
    fetched: true,
    statusCode: options.statusCode,
    validXml: parsed.validXml,
    urlCount: parsed.urls.length,
    sameOriginCount,
    lastmodCount,
    declaredInRobots: options.declaredInRobots,
    parseErrors: parsed.parseErrors,
  };
}
