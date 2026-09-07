import { buildInspection, runRules } from "@agentlens/analyzer";
import { crawlWebsite } from "@agentlens/crawler";
import { scoreFindings } from "@agentlens/scoring";
import type { AnalysisResult, AnalyzeOptions } from "@agentlens/shared";
import { analysisResultSchema } from "@agentlens/shared";

export async function analyzeWebsite(options: AnalyzeOptions): Promise<AnalysisResult> {
  const crawl = await crawlWebsite(options);
  options.onStage?.("analyzing-metadata");
  options.onStage?.("inspecting-semantic-html");
  options.onStage?.("analyzing-structured-data");
  options.onStage?.("checking-ai-crawlers");
  const findings = await runRules(crawl);
  options.onStage?.("calculating-score");
  const scored = scoreFindings(findings);
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
  };

  options.onStage?.("complete");
  return analysisResultSchema.parse(result);
}
