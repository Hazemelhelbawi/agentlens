import { load } from "cheerio";
import type { CrawlResult, PageSnapshot } from "@agentlens/crawler";
import type { CrawlerAnalysis, TechnicalAnalysis } from "@agentlens/shared";
import type { AnalyzerContext } from "./types.js";

const emptyCrawler = (): CrawlerAnalysis => ({
  robotsTxt: {
    fetched: false,
    parseErrors: [],
    groups: [],
    sitemaps: [],
    crawlers: [],
  },
  sitemap: {
    fetched: false,
    validXml: false,
    urlCount: 0,
    sameOriginCount: 0,
    lastmodCount: 0,
    declaredInRobots: false,
    parseErrors: [],
  },
  llmsTxt: {
    path: "/llms.txt",
    fetched: false,
    hasTitle: false,
    hasDescription: false,
    linkCount: 0,
  },
  llmsFullTxt: {
    path: "/llms-full.txt",
    fetched: false,
    hasTitle: false,
    hasDescription: false,
    linkCount: 0,
  },
});

export function contextFromHtml(
  html: string,
  options: {
    url?: string;
    statusCode?: number;
    headers?: Record<string, string>;
    crawler?: Partial<CrawlerAnalysis>;
    technical?: Partial<TechnicalAnalysis>;
  } = {},
): AnalyzerContext {
  const url = options.url ?? "https://example.com/";
  const $ = load(html);
  const page: PageSnapshot = {
    url,
    finalUrl: url,
    statusCode: options.statusCode ?? 200,
    html,
    $,
    headers: options.headers ?? { "content-type": "text/html; charset=utf-8" },
    bytes: Buffer.byteLength(html),
    responseTimeMs: 50,
  };

  const baseCrawler = emptyCrawler();
  const crawl: CrawlResult = {
    homepage: page,
    extraPages: [],
    technical: {
      https: url.startsWith("https://"),
      statusCode: page.statusCode,
      redirectCount: 0,
      finalUrl: url,
      contentType: page.headers["content-type"],
      responseTimeMs: 50,
      responseBytes: page.bytes,
      ...options.technical,
    },
    crawler: {
      ...baseCrawler,
      ...options.crawler,
      robotsTxt: { ...baseCrawler.robotsTxt, ...options.crawler?.robotsTxt },
      sitemap: { ...baseCrawler.sitemap, ...options.crawler?.sitemap },
      llmsTxt: { ...baseCrawler.llmsTxt, ...options.crawler?.llmsTxt },
      llmsFullTxt: { ...baseCrawler.llmsFullTxt, ...options.crawler?.llmsFullTxt },
    },
    robotsBody: null,
    sitemapBody: null,
    llmsTxtBody: null,
    llmsFullTxtBody: null,
  };

  return { url, page, crawl, $ };
}
