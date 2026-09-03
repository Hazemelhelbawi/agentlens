import type { CheerioAPI } from "cheerio";
import { load } from "cheerio";
import type { AnalyzeOptions, CrawlerAnalysis, TechnicalAnalysis } from "@agentlens/shared";
import {
  DEFAULT_CONCURRENCY,
  DEFAULT_MAX_PAGES,
  DEFAULT_MAX_RESPONSE_BYTES,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
} from "@agentlens/shared";
import { fetchSafe, type FetchedResource } from "./fetch.js";
import { createLimiter } from "./limit.js";
import { emptyLlmsTxt, parseLlmsTxt } from "./llms-txt.js";
import { analyzeRobotsTxt, isPathAllowed } from "./robots.js";
import { analyzeSitemap, parseSitemapXml } from "./sitemap.js";
import { isSameOrigin, originOf, resolveUrl } from "./ssrf.js";

export interface PageSnapshot {
  url: string;
  finalUrl: string;
  statusCode: number;
  html: string;
  $: CheerioAPI;
  headers: Record<string, string>;
  bytes: number;
  responseTimeMs: number;
}

export interface CrawlResult {
  homepage: PageSnapshot;
  extraPages: PageSnapshot[];
  technical: TechnicalAnalysis;
  crawler: CrawlerAnalysis;
  robotsBody: string | null;
  sitemapBody: string | null;
  llmsTxtBody: string | null;
  llmsFullTxtBody: string | null;
}

async function fetchOptional(
  url: string,
  options: Parameters<typeof fetchSafe>[1],
): Promise<FetchedResource | null> {
  try {
    return await fetchSafe(url, options);
  } catch {
    return null;
  }
}

function toSnapshot(resource: FetchedResource): PageSnapshot {
  return {
    url: resource.requestedUrl,
    finalUrl: resource.finalUrl,
    statusCode: resource.statusCode,
    html: resource.body,
    $: load(resource.body),
    headers: resource.headers,
    bytes: resource.bytes,
    responseTimeMs: resource.responseTimeMs,
  };
}

function collectCandidateUrls(
  homepage: PageSnapshot,
  sitemapBody: string | null,
  maxPages: number,
): string[] {
  const seen = new Set<string>([homepage.finalUrl]);
  const candidates: string[] = [];

  const add = (raw: string | null) => {
    if (!raw) return;
    if (!isSameOrigin(raw, homepage.finalUrl)) return;
    const normalized = raw.split("#")[0] ?? raw;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  if (sitemapBody) {
    const parsed = parseSitemapXml(sitemapBody, homepage.finalUrl);
    for (const entry of parsed.urls) add(entry.loc);
  }

  homepage.$("a[href]").each((_, el) => {
    const href = homepage.$(el).attr("href");
    if (!href) return;
    add(resolveUrl(homepage.finalUrl, href));
  });

  return candidates.slice(0, maxPages);
}

export async function crawlWebsite(options: AnalyzeOptions): Promise<CrawlResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const maxPages = options.pages ?? DEFAULT_MAX_PAGES;
  const fetchOpts = { timeoutMs, maxResponseBytes, userAgent };

  const homepageResource = await fetchSafe(options.url, fetchOpts);
  const homepage = toSnapshot(homepageResource);
  const origin = originOf(homepage.finalUrl);

  const [robotsRes, sitemapRes, llmsRes, llmsFullRes] = await Promise.all([
    fetchOptional(`${origin}/robots.txt`, fetchOpts),
    fetchOptional(`${origin}/sitemap.xml`, fetchOpts),
    fetchOptional(`${origin}/llms.txt`, fetchOpts),
    fetchOptional(`${origin}/llms-full.txt`, fetchOpts),
  ]);

  const robotsBody =
    robotsRes && robotsRes.statusCode >= 200 && robotsRes.statusCode < 300
      ? robotsRes.body
      : null;
  const robots = analyzeRobotsTxt(robotsBody, robotsRes?.statusCode);

  let sitemapBody =
    sitemapRes && sitemapRes.statusCode >= 200 && sitemapRes.statusCode < 300
      ? sitemapRes.body
      : null;
  let sitemapStatus = sitemapRes?.statusCode;

  if (!sitemapBody && robots.sitemaps[0]) {
    const declared = await fetchOptional(robots.sitemaps[0], fetchOpts);
    if (declared && declared.statusCode >= 200 && declared.statusCode < 300) {
      sitemapBody = declared.body;
      sitemapStatus = declared.statusCode;
    } else {
      sitemapStatus = declared?.statusCode ?? sitemapStatus;
    }
  }

  const sitemap = analyzeSitemap(sitemapBody, homepage.finalUrl, {
    statusCode: sitemapStatus,
    declaredInRobots: robots.sitemaps.length > 0,
  });

  const llmsTxt =
    llmsRes && llmsRes.statusCode >= 200 && llmsRes.statusCode < 300
      ? parseLlmsTxt(llmsRes.body, "/llms.txt", llmsRes.statusCode)
      : emptyLlmsTxt("/llms.txt", llmsRes?.statusCode);

  const llmsFullTxt =
    llmsFullRes && llmsFullRes.statusCode >= 200 && llmsFullRes.statusCode < 300
      ? parseLlmsTxt(llmsFullRes.body, "/llms-full.txt", llmsFullRes.statusCode)
      : emptyLlmsTxt("/llms-full.txt", llmsFullRes?.statusCode);

  const extraPages: PageSnapshot[] = [];
  if (maxPages > 0) {
    const robotsGroups = robots.groups;
    const candidates = collectCandidateUrls(homepage, sitemapBody, maxPages);
    const limit = createLimiter(concurrency);

    await Promise.all(
      candidates.map((url) =>
        limit(async () => {
          const path = new URL(url).pathname;
          if (robotsBody && !isPathAllowed(robotsGroups, "AgentLens", path)) {
            return;
          }
          const resource = await fetchOptional(url, fetchOpts);
          if (resource && resource.statusCode >= 200 && resource.statusCode < 400) {
            extraPages.push(toSnapshot(resource));
          }
        }),
      ),
    );
  }

  const technical: TechnicalAnalysis = {
    https: homepage.finalUrl.startsWith("https://"),
    statusCode: homepage.statusCode,
    redirectCount: homepageResource.redirectCount,
    finalUrl: homepage.finalUrl,
    contentType: homepageResource.contentType,
    responseTimeMs: homepageResource.responseTimeMs,
    responseBytes: homepageResource.bytes,
  };

  return {
    homepage,
    extraPages,
    technical,
    crawler: {
      robotsTxt: robots,
      sitemap,
      llmsTxt,
      llmsFullTxt,
    },
    robotsBody,
    sitemapBody,
    llmsTxtBody: llmsTxt.fetched ? (llmsRes?.body ?? null) : null,
    llmsFullTxtBody: llmsFullTxt.fetched ? (llmsFullRes?.body ?? null) : null,
  };
}
