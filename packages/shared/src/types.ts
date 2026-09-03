import type { Category, Grade, Severity } from "./categories.js";

export interface FindingEvidence {
  url?: string;
  selector?: string;
  value?: string;
}

export interface Finding {
  id: string;
  category: Category;
  title: string;
  description: string;
  severity: Severity;
  score: number;
  maxScore: number;
  recommendation?: string;
  evidence?: FindingEvidence;
}

export interface CategoryScore {
  id: Category;
  name: string;
  emoji: string;
  score: number;
  weight: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: Category;
  severity: Severity;
}

export interface TechnicalAnalysis {
  https: boolean;
  statusCode: number;
  redirectCount: number;
  finalUrl: string;
  contentType?: string;
  responseTimeMs: number;
  responseBytes: number;
}

export interface RobotsGroup {
  userAgents: string[];
  allow: string[];
  disallow: string[];
}

export interface RobotsTxtAnalysis {
  fetched: boolean;
  statusCode?: number;
  parseErrors: string[];
  groups: RobotsGroup[];
  sitemaps: string[];
  crawlers: CrawlerAccess[];
}

export interface CrawlerAccess {
  name: string;
  status: "restricted" | "allowed" | "unspecified";
  detail: string;
}

export interface SitemapAnalysis {
  fetched: boolean;
  statusCode?: number;
  validXml: boolean;
  urlCount: number;
  sameOriginCount: number;
  lastmodCount: number;
  declaredInRobots: boolean;
  parseErrors: string[];
}

export interface LlmsTxtAnalysis {
  path: string;
  fetched: boolean;
  statusCode?: number;
  hasTitle: boolean;
  hasDescription: boolean;
  linkCount: number;
}

export interface CrawlerAnalysis {
  robotsTxt: RobotsTxtAnalysis;
  sitemap: SitemapAnalysis;
  llmsTxt: LlmsTxtAnalysis;
  llmsFullTxt: LlmsTxtAnalysis;
}

export interface AnalysisResult {
  url: string;
  timestamp: string;
  score: number;
  grade: Grade;
  categories: CategoryScore[];
  findings: Finding[];
  technical: TechnicalAnalysis;
  crawler: CrawlerAnalysis;
  recommendations: Recommendation[];
}

export interface AnalyzeOptions {
  url: string;
  pages?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
  userAgent?: string;
  concurrency?: number;
}

export const DEFAULT_USER_AGENT =
  "AgentLens/0.1 (+https://github.com/hazemelhelbawi/agentlens)";

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_CONCURRENCY = 3;
export const DEFAULT_MAX_PAGES = 0;
