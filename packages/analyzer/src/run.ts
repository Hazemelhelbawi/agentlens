import type { Finding } from "@agentlens/shared";
import type { CrawlResult } from "@agentlens/crawler";
import { rules } from "./rules/index.js";
import type { AnalyzerContext } from "./types.js";

export async function runRules(crawl: CrawlResult): Promise<Finding[]> {
  const ctx: AnalyzerContext = {
    url: crawl.homepage.url,
    page: crawl.homepage,
    crawl,
    $: crawl.homepage.$,
  };

  const findings: Finding[] = [];
  for (const rule of rules) {
    const result = await rule.check(ctx);
    findings.push(...result);
  }
  return findings;
}
