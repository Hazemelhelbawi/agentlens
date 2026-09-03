import type { CheerioAPI } from "cheerio";
import type { Category, Finding, FindingEvidence, Severity } from "@agentlens/shared";
import type { CrawlResult, PageSnapshot } from "@agentlens/crawler";

export interface AnalyzerContext {
  url: string;
  page: PageSnapshot;
  crawl: CrawlResult;
  $: CheerioAPI;
}

export interface AnalyzerRule {
  id: string;
  category: Category;
  check(context: AnalyzerContext): Finding[] | Promise<Finding[]>;
}

export function finding(
  partial: {
    id: string;
    category: Category;
    title: string;
    description: string;
    severity: Severity;
    score: number;
    maxScore: number;
    recommendation?: string;
    evidence?: FindingEvidence;
  },
): Finding {
  return { ...partial };
}

export function visibleText($: CheerioAPI): string {
  const clone = $.load($.html());
  clone("script, style, noscript, svg, canvas").remove();
  return clone("body").text().replace(/\s+/g, " ").trim();
}

export function attr($: CheerioAPI, selector: string, name: string): string | undefined {
  const value = $(selector).first().attr(name);
  return value?.trim() || undefined;
}

export function content($: CheerioAPI, selector: string): string | undefined {
  const value = $(selector).first().attr("content") ?? $(selector).first().text();
  const trimmed = value?.trim();
  return trimmed || undefined;
}
