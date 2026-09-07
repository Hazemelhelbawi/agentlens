import type { Severity } from "@agentlens/shared";

export const SEVERITY_META: Record<
  Severity,
  { label: string; icon: string; className: string }
> = {
  critical: { label: "Critical", icon: "●", className: "sev-critical" },
  warning: { label: "Warning", icon: "▲", className: "sev-warning" },
  info: { label: "Info", icon: "ℹ", className: "sev-info" },
  pass: { label: "Passed", icon: "✓", className: "sev-pass" },
};

export const TIPS: Record<string, string> = {
  "AI Agent Readiness":
    "A heuristic for how easily fetch-based agents and crawlers can understand this page. Not an official ranking from any AI provider.",
  "LLM Discoverability":
    "Signals such as llms.txt and AI crawler robots rules. llms.txt is an emerging convention, not a mandatory web standard.",
  "Semantic HTML": "Landmarks, headings, images, and forms that give machines a page outline.",
  "Agent UX":
    "Whether navigation, links, buttons, metadata, and structured data give an agent clear actions and destinations.",
  "Structured Data": "JSON-LD blocks such as Organization, WebSite, or Article. Not full Schema.org validation.",
  Crawlability: "HTTPS, robots.txt, sitemap, canonical, and indexability signals.",
  "Content Access": "Title, description, and how much meaningful text is in the first HTML/DOM.",
  "Technical SEO": "Viewport, Open Graph, robots meta, and response hygiene.",
};
