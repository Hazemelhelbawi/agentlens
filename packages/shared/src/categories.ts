export const CATEGORIES = [
  "crawlability",
  "content-access",
  "semantic-html",
  "structured-data",
  "llm-discoverability",
  "agent-ux",
  "technical-seo",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<
  Category,
  { name: string; emoji: string; weight: number }
> = {
  crawlability: { name: "Crawlability", emoji: "🕷", weight: 0.2 },
  "content-access": { name: "Content Access", emoji: "📄", weight: 0.15 },
  "semantic-html": { name: "Semantic HTML", emoji: "🧱", weight: 0.15 },
  "structured-data": { name: "Structured Data", emoji: "🏷", weight: 0.15 },
  "llm-discoverability": { name: "LLM Discoverability", emoji: "🧠", weight: 0.1 },
  "agent-ux": { name: "Agent UX", emoji: "🔗", weight: 0.15 },
  "technical-seo": { name: "Technical SEO", emoji: "⚙️", weight: 0.1 },
};

export const SEVERITIES = ["critical", "warning", "info", "pass"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const GRADES = ["poor", "needs-work", "fair", "good", "excellent"] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABELS: Record<Grade, string> = {
  poor: "Poor",
  "needs-work": "Needs Work",
  fair: "Fair",
  good: "Good",
  excellent: "Excellent",
};

export function gradeFromScore(score: number): Grade {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "fair";
  if (score >= 40) return "needs-work";
  return "poor";
}

export const KNOWN_AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
  "Amazonbot",
  "Bytespider",
  "CCBot",
] as const;

export type KnownAiCrawler = (typeof KNOWN_AI_CRAWLERS)[number];
