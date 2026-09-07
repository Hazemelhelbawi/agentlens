import { load } from "cheerio";
import type { CrawlResult, PageSnapshot } from "@agentlens/crawler";
import { analyzeRobotsTxt, analyzeSitemap, emptyLlmsTxt, parseLlmsTxt } from "@agentlens/crawler";
import type {
  AnalysisResult,
  AnalyzeStage,
  DomStats,
  InspectTarget,
} from "@agentlens/shared";
import { analysisResultSchema } from "@agentlens/shared";
import { scoreFindings } from "@agentlens/scoring";
import { attachInspectTargets, collectInspectTargets, mergeInspectTargets } from "./inspect.js";
import { buildInspection } from "./inspection.js";
import { runRules } from "./run.js";

export interface CollectedPageInput {
  url: string;
  html: string;
  title?: string;
  language?: string;
  robots?: { status: number; body: string | null };
  sitemap?: { status: number; body: string | null };
  llmsTxt?: { status: number; body: string | null };
  llmsFullTxt?: { status: number; body: string | null };
  stats?: DomStats;
  inspectTargets?: InspectTarget[];
  truncated?: boolean;
  statusCode?: number;
  onStage?: (stage: AnalyzeStage) => void;
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function crawlFromCollected(input: CollectedPageInput): CrawlResult {
  const url = input.url;
  const html = input.html;
  const $ = load(html);
  const page: PageSnapshot = {
    url,
    finalUrl: url,
    statusCode: input.statusCode ?? 200,
    html,
    $,
    headers: { "content-type": "text/html; charset=utf-8" },
    bytes: utf8Bytes(html),
    responseTimeMs: 0,
  };

  const robotsBody = input.robots?.body ?? null;
  const sitemapBody = input.sitemap?.body ?? null;
  const llmsBody = input.llmsTxt?.body ?? null;
  const llmsFullBody = input.llmsFullTxt?.body ?? null;
  const robots = analyzeRobotsTxt(robotsBody, input.robots?.status);
  const sitemap = analyzeSitemap(sitemapBody, url, {
    statusCode: input.sitemap?.status,
    declaredInRobots: robots.sitemaps.length > 0,
  });

  return {
    homepage: page,
    extraPages: [],
    technical: {
      https: url.startsWith("https:"),
      statusCode: page.statusCode,
      redirectCount: 0,
      finalUrl: url,
      contentType: "text/html",
      responseTimeMs: 0,
      responseBytes: page.bytes,
    },
    crawler: {
      robotsTxt: robots,
      sitemap,
      llmsTxt: llmsBody
        ? parseLlmsTxt(llmsBody, "/llms.txt", input.llmsTxt?.status)
        : emptyLlmsTxt("/llms.txt", input.llmsTxt?.status),
      llmsFullTxt: llmsFullBody
        ? parseLlmsTxt(llmsFullBody, "/llms-full.txt", input.llmsFullTxt?.status)
        : emptyLlmsTxt("/llms-full.txt", input.llmsFullTxt?.status),
    },
    robotsBody,
    sitemapBody,
    llmsTxtBody: llmsBody,
    llmsFullTxtBody: llmsFullBody,
  };
}

export function countDomStats(html: string, live?: DomStats): DomStats {
  if (live) return live;
  const $ = load(html);
  return {
    links: $("a[href]").length,
    buttons: $("button, [role='button'], input[type='button'], input[type='submit']").length,
    images: $("img").length,
    headings: $("h1, h2, h3, h4, h5, h6").length,
    forms: $("form").length,
    jsonLd: $('script[type="application/ld+json"]').length,
    inputs: $("input:not([type='hidden']), select, textarea").length,
  };
}

export async function analyzeCollectedPage(input: CollectedPageInput): Promise<AnalysisResult> {
  const crawl = crawlFromCollected(input);
  input.onStage?.("analyzing-metadata");
  const findings = await runRules(crawl);
  input.onStage?.("inspecting-semantic-html");
  input.onStage?.("analyzing-structured-data");
  input.onStage?.("checking-ai-crawlers");
  input.onStage?.("checking-llms");
  const generated = collectInspectTargets({
    url: crawl.homepage.url,
    page: crawl.homepage,
    crawl,
    $: crawl.homepage.$,
  });
  const merged = attachInspectTargets(findings, mergeInspectTargets(generated, input.inspectTargets ?? []));
  const scored = scoreFindings(merged);
  input.onStage?.("calculating-score");
  const inspection = buildInspection(crawl);

  const result: AnalysisResult = {
    url: crawl.homepage.finalUrl,
    timestamp: new Date().toISOString(),
    score: scored.score,
    grade: scored.grade,
    categories: scored.categories,
    findings: scored.findings,
    technical: crawl.technical,
    crawler: crawl.crawler,
    recommendations: scored.recommendations,
    inspection,
    breakdown: scored.breakdown,
    insights: scored.insights,
    domStats: countDomStats(input.html, input.stats),
    source: "extension",
    language: input.language,
    truncated: input.truncated,
  };

  input.onStage?.("complete");
  return analysisResultSchema.parse(result);
}
