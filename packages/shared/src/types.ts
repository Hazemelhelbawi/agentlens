import type { Category, Grade, Severity } from "./categories.js";

export type EvidencePrecision = "line" | "selector" | "url" | "document";

export interface InspectTarget {
  ruleId: string;
  selector: string;
  unique: boolean;
  tagName: string;
  text?: string;
  snippet?: string;
  href?: string;
}

export interface DomStats {
  links: number;
  buttons: number;
  images: number;
  headings: number;
  forms: number;
  jsonLd: number;
  inputs: number;
}

export interface FindingEvidence {
  url?: string;
  selector?: string;
  value?: string;
  snippet?: string;
  source?: string;
  line?: number;
  location?: string;
  precision?: EvidencePrecision;
  tagName?: string;
  text?: string;
  inspectable?: boolean;
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
  whyItMatters?: string;
  recommendedFix?: string;
  detectedSnippet?: string;
  affectedPages?: string[];
  scoreImpact?: number;
  inspectTargets?: InspectTarget[];
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
  host?: string[];
  otherDirectives?: Array<{ field: string; value: string }>;
}

export interface CrawlerAccess {
  name: string;
  status: "restricted" | "allowed" | "unspecified";
  detail: string;
  snippet?: string;
  line?: number;
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

export type SeoCheckStatus = "pass" | "warning" | "fail" | "info" | "unknown";
export type FileFetchStatus = "found" | "not-found" | "error" | "unknown";
export type CrawlerRuleStatus = "allowed" | "blocked" | "no-specific-rule" | "unknown";

export interface HeadingNode {
  level: number;
  text: string;
  tag?: string;
  empty?: boolean;
  selector?: string;
  unique?: boolean;
}

export interface LinkIssue {
  href: string;
  text: string;
  kind: "generic" | "empty";
  rel?: string;
  internal?: boolean;
  nofollow?: boolean;
  sponsored?: boolean;
  ugc?: boolean;
  selector?: string;
  unique?: boolean;
}

export interface ImageIssue {
  src?: string;
  alt?: string;
  kind: "missing" | "empty";
  width?: string;
  height?: string;
  loading?: string;
  inLink?: boolean;
  selector?: string;
  unique?: boolean;
}

export interface JsonLdBlock {
  index: number;
  types: string[];
  valid: boolean;
  raw: string;
  missingFields: string[];
  selector?: string;
  unique?: boolean;
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  sameOrigin: boolean;
}

export interface SeoUrlParts {
  href: string;
  protocol: string;
  https: boolean;
  hostname: string;
  pathname: string;
  search?: string;
}

export interface SeoFieldSnapshot {
  value?: string;
  length?: number;
  status: SeoCheckStatus;
  notes: string[];
}

export interface SeoCanonicalSnapshot {
  href?: string;
  count: number;
  absolute?: boolean;
  matchesCurrent?: boolean;
  status: SeoCheckStatus;
  notes: string[];
}

export interface SeoRobotsMetaSnapshot {
  content?: string;
  directives: string[];
}

export interface SeoSnapshot {
  url: SeoUrlParts;
  title: SeoFieldSnapshot;
  description: SeoFieldSnapshot;
  canonical: SeoCanonicalSnapshot;
  robotsMeta: SeoRobotsMetaSnapshot;
  language: SeoFieldSnapshot;
  charset: SeoFieldSnapshot;
  viewport: SeoFieldSnapshot;
}

export interface LinkRecord {
  href: string;
  text: string;
  rel?: string;
  internal?: boolean;
  nofollow?: boolean;
  sponsored?: boolean;
  ugc?: boolean;
  kind: "ok" | "generic" | "empty" | "javascript" | "image-only";
  selector?: string;
  unique?: boolean;
}

export interface LinkIndex {
  total: number;
  internal: number;
  external: number;
  unknownOrigin: number;
  nofollow: number;
  sponsored: number;
  ugc: number;
  generic: number;
  empty: number;
  javascript: number;
  imageOnly: number;
  items: LinkRecord[];
}

export interface ImageRecord {
  src?: string;
  alt?: string;
  altKind: "present" | "missing" | "empty";
  width?: string;
  height?: string;
  loading?: string;
  inLink?: boolean;
  selector?: string;
  unique?: boolean;
}

export interface ImageIndex {
  total: number;
  withAlt: number;
  missingAlt: number;
  emptyAlt: number;
  decorative: number;
  withDimensions: number;
  withoutDimensions: number;
  lazy: number;
  imageLinks: number;
  items: ImageRecord[];
}

export interface SchemaSnapshot {
  jsonLdCount: number;
  microdataCount: number;
  rdfaCount: number;
  types: string[];
}

export interface SitemapSnapshot {
  status: FileFetchStatus;
  url?: string;
  isIndex?: boolean;
  urlCount: number;
  childSitemaps: string[];
  duplicateCount: number;
  missingLocCount: number;
  invalidUrlCount: number;
  canonicalInSitemap?: boolean;
}

export interface RobotsSnapshot {
  status: FileFetchStatus;
  url?: string;
  host: string[];
  otherDirectives: Array<{ field: string; value: string }>;
}

export interface AnalyzedPage {
  url: string;
  path: string;
  statusCode: number;
  title?: string;
}

export interface AnalysisInspection {
  headings: HeadingNode[];
  landmarks: Record<string, number>;
  links: {
    total: number;
    descriptive: number;
    generic: number;
    empty: number;
    issues: LinkIssue[];
  };
  images: {
    total: number;
    withAlt: number;
    missingAlt: number;
    emptyAlt: number;
    decorative: number;
    issues: ImageIssue[];
  };
  jsonLd: JsonLdBlock[];
  sitemapUrls: SitemapUrlEntry[];
  robotsRaw?: string;
  sitemapRaw?: string;
  llmsRaw?: string;
  llmsFullRaw?: string;
  pages: AnalyzedPage[];
  seo?: SeoSnapshot;
  headingCounts?: Record<string, number>;
  headingWarnings?: string[];
  linkIndex?: LinkIndex;
  imageIndex?: ImageIndex;
  schema?: SchemaSnapshot;
  sitemapMeta?: SitemapSnapshot;
  robotsDetail?: RobotsSnapshot;
}

export interface ScoreBreakdownRow {
  id: Category;
  name: string;
  weight: number;
  score: number;
  points: number;
  checks: Array<{
    id: string;
    title: string;
    score: number;
    maxScore: number;
    severity: Severity;
  }>;
}

export interface AnalysisInsights {
  summary: string;
  strongest: string[];
  weakest: string[];
  topActions: Array<{
    id: string;
    title: string;
    severity: Severity;
    scoreImpact: number;
    affectedPages: number;
  }>;
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
  inspection?: AnalysisInspection;
  breakdown?: ScoreBreakdownRow[];
  insights?: AnalysisInsights;
  domStats?: DomStats;
  source?: "crawler" | "extension";
  language?: string;
  truncated?: boolean;
}

export type AnalyzeStage =
  | "connecting"
  | "fetching-homepage"
  | "checking-https"
  | "reading-robots"
  | "checking-sitemap"
  | "analyzing-metadata"
  | "inspecting-semantic-html"
  | "analyzing-structured-data"
  | "checking-ai-crawlers"
  | "checking-llms"
  | "calculating-score"
  | "complete";

export interface AnalyzeOptions {
  url: string;
  pages?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
  userAgent?: string;
  concurrency?: number;
  onStage?: (stage: AnalyzeStage) => void;
}

export const DEFAULT_USER_AGENT =
  "AgentLens/0.1 (+https://github.com/hazemelhelbawi/agentlens)";

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_CONCURRENCY = 3;
export const DEFAULT_MAX_PAGES = 0;

export const ANALYZE_STAGES: Array<{ id: AnalyzeStage; label: string }> = [
  { id: "connecting", label: "Connecting to website" },
  { id: "fetching-homepage", label: "Fetching homepage" },
  { id: "checking-https", label: "Checking HTTPS" },
  { id: "reading-robots", label: "Reading robots.txt" },
  { id: "checking-sitemap", label: "Checking sitemap" },
  { id: "analyzing-metadata", label: "Analyzing metadata" },
  { id: "inspecting-semantic-html", label: "Inspecting semantic HTML" },
  { id: "analyzing-structured-data", label: "Analyzing structured data" },
  { id: "checking-ai-crawlers", label: "Checking AI crawler policies" },
  { id: "checking-llms", label: "Checking llms.txt" },
  { id: "calculating-score", label: "Calculating score" },
  { id: "complete", label: "Complete" },
];
