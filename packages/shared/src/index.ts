export {
  CATEGORIES,
  CATEGORY_META,
  SEVERITIES,
  GRADES,
  GRADE_LABELS,
  KNOWN_AI_CRAWLERS,
  gradeFromScore,
} from "./categories.js";
export type { Category, Severity, Grade, KnownAiCrawler } from "./categories.js";

export type {
  FindingEvidence,
  Finding,
  CategoryScore,
  Recommendation,
  TechnicalAnalysis,
  RobotsGroup,
  RobotsTxtAnalysis,
  CrawlerAccess,
  SitemapAnalysis,
  LlmsTxtAnalysis,
  CrawlerAnalysis,
  AnalysisResult,
  AnalyzeOptions,
} from "./types.js";

export {
  DEFAULT_USER_AGENT,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RESPONSE_BYTES,
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_CONCURRENCY,
  DEFAULT_MAX_PAGES,
} from "./types.js";

export { findingSchema, analysisResultSchema } from "./schema.js";
export type { AnalysisResultJson } from "./schema.js";
