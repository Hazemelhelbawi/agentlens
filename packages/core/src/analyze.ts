import { runRules } from "@agentlens/analyzer";
import { crawlWebsite } from "@agentlens/crawler";
import { scoreFindings } from "@agentlens/scoring";
import type { AnalysisResult, AnalyzeOptions } from "@agentlens/shared";
import { analysisResultSchema } from "@agentlens/shared";

export async function analyzeWebsite(options: AnalyzeOptions): Promise<AnalysisResult> {
  const crawl = await crawlWebsite(options);
  const findings = await runRules(crawl);
  const scored = scoreFindings(findings);

  const result: AnalysisResult = {
    url: crawl.homepage.finalUrl,
    timestamp: new Date().toISOString(),
    score: scored.score,
    grade: scored.grade,
    categories: scored.categories,
    findings,
    technical: crawl.technical,
    crawler: crawl.crawler,
    recommendations: scored.recommendations,
  };

  return analysisResultSchema.parse(result);
}
