import type { Finding, FindingEvidence } from "@agentlens/shared";
import type { AnalyzerContext } from "./types.js";

const GENERIC_LABELS = new Set([
  "click here",
  "read more",
  "learn more",
  "more",
  "here",
  "this",
  "link",
  "continue",
]);

export function uniqueLineOf(source: string, needle: string): number | undefined {
  if (!needle || needle.length < 3) return undefined;
  const index = source.indexOf(needle);
  if (index < 0) return undefined;
  if (source.indexOf(needle, index + 1) !== -1) return undefined;
  return source.slice(0, index).split(/\r?\n/).length;
}

export function clip(text: string, max = 480): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function elementSnippet(ctx: AnalyzerContext, selector: string): string | undefined {
  const node = ctx.$(selector).first();
  if (node.length === 0) return undefined;
  const html = node.toString();
  return html ? clip(html) : undefined;
}

export function lineInHtml(ctx: AnalyzerContext, needle: string): number | undefined {
  return uniqueLineOf(ctx.page.html, needle);
}

export function lineInRobots(ctx: AnalyzerContext, needle: string): number | undefined {
  if (!ctx.crawl.robotsBody) return undefined;
  return uniqueLineOf(ctx.crawl.robotsBody, needle);
}

export function robotsGroupSnippet(ctx: AnalyzerContext, userAgent: string): { snippet?: string; line?: number } {
  const body = ctx.crawl.robotsBody;
  if (!body) return {};
  const lines = body.split(/\r?\n/);
  const target = `user-agent: ${userAgent.toLowerCase()}`;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim().toLowerCase();
    if (line.startsWith(target) || line === target) {
      start = i;
      break;
    }
  }
  if (start < 0) return {};
  const chunk: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    if (i > start && /^\s*user-agent:/i.test(raw)) break;
    chunk.push(raw);
    if (chunk.length >= 8) break;
  }
  return { snippet: chunk.join("\n").trim(), line: start + 1 };
}

export function isGenericLabel(text: string): boolean {
  return GENERIC_LABELS.has(text.replace(/\s+/g, " ").trim().toLowerCase());
}

const WHY: Record<string, string> = {
  "http-status":
    "Non-200 responses stop most fetch-based crawlers and agents from reading the page at all.",
  https:
    "TLS is a baseline expectation for crawlers, browsers, and automated clients that refuse mixed or plaintext origins.",
  redirects:
    "Long redirect chains waste crawl budget and can hide the canonical destination from simpler agents.",
  "robots-txt":
    "robots.txt is the first machine-readable policy file crawlers request. Syntax errors or a missing file reduce how clearly you declare crawl intent.",
  sitemap:
    "A sitemap helps crawlers discover URLs that are not linked from the homepage.",
  canonical:
    "A canonical URL tells machines which address is the preferred version of this page when duplicates or tracking variants exist.",
  indexability:
    "noindex signals tell compliant crawlers not to include the page in their index.",
  title:
    "The document title is one of the strongest short labels a machine can use to name the page.",
  description:
    "A meta description gives crawlers and unfurlers a concise summary when they cannot infer one from the body.",
  "text-content":
    "Fetch-based agents read the first HTML response. Very little visible text means they see less of the page without executing JavaScript.",
  "csr-detection":
    "An empty application shell in the first HTML response is a heuristic that content may depend on client rendering. It does not mean agents cannot access the site.",
  headings:
    "A single H1 and a logical H2/H3 outline give agents a page hierarchy they can follow without layout cues.",
  landmarks:
    "Landmark elements such as main and nav identify page regions for machines and assistive tools.",
  "images-alt":
    "Alt text is the machine-readable name of an image. This check only inspects the alt attribute.",
  forms:
    "Labeled fields let agents understand what a form collects before submitting it.",
  "json-ld":
    "JSON-LD can identify the entity, page type, and relationships behind a URL. This is not complete Schema.org validation.",
  "llms-txt":
    "llms.txt is an emerging convention for a machine-readable site description. It is not a mandatory web standard, and its absence does not mean a site is not AI-ready.",
  "llms-full-txt":
    "llms-full.txt is an optional companion to llms.txt. It is an emerging convention, not a requirement.",
  "ai-crawlers":
    "Dedicated robots.txt groups can restrict named AI crawlers. Unspecified does not guarantee access; crawler behavior can change independently.",
  links:
    "Descriptive link text gives agents destination context. Generic phrases are not automatically a failure.",
  "agent-ux":
    "Agent UX is a documented heuristic over navigation, canonical URLs, structured data, metadata, landmarks, headings, and link names.",
  interactive:
    "Buttons and other controls need an accessible name so agents can tell what action they perform. Icon-only controls without aria-label are ambiguous.",
  viewport:
    "A viewport tag is a basic document hint used by browsers and some renderers.",
  "open-graph":
    "Open Graph tags provide a stable title, description, and URL for unfurls and some machine clients.",
  "twitter-meta":
    "Twitter/X card tags are optional social metadata. Their absence is informational, not a crawl blocker.",
  "robots-meta":
    "A robots meta tag, when present, is an additional indexability signal on the page itself.",
  "response-hygiene":
    "Very slow or extremely large first responses make fetch-based analysis and crawling less reliable.",
};

function defaultFix(ctx: AnalyzerContext, finding: Finding): string | undefined {
  const url = ctx.page.finalUrl;
  switch (finding.id) {
    case "canonical":
      return `<link rel="canonical" href="${url}" />`;
    case "description":
      return `<meta name="description" content="A one-sentence summary of this page in plain language." />`;
    case "title":
      return `<title>Descriptive page title</title>`;
    case "https":
      return `Redirect http:// to https:// and serve a valid TLS certificate.`;
    case "json-ld":
      return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${new URL(url).hostname}",
  "url": "${new URL(url).origin}"
}
</script>`;
    case "llms-txt":
      return `# ${new URL(url).hostname}
> A short description of this website.

## Docs
- [Home](${url}): Primary page
`;
    case "viewport":
      return `<meta name="viewport" content="width=device-width, initial-scale=1" />`;
    case "open-graph":
      return `<meta property="og:title" content="Page title" />
<meta property="og:description" content="Short description" />
<meta property="og:url" content="${url}" />`;
    case "twitter-meta":
      return `<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Page title" />`;
    case "links":
      return `<a href="/pricing">View pricing plans</a>`;
    case "interactive":
      return `<button type="button">Start free trial</button>`;
    case "sitemap":
      return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${url}</loc></url>
</urlset>`;
    case "robots-txt":
      return `User-agent: *
Allow: /
Sitemap: ${new URL(url).origin}/sitemap.xml`;
    default:
      return undefined;
  }
}

export function enhanceEvidence(finding: Finding, ctx: AnalyzerContext): FindingEvidence {
  const current = finding.evidence ?? {};
  const selector = current.selector;
  const snippet =
    current.snippet ??
    (selector ? elementSnippet(ctx, selector) : undefined) ??
    current.value;

  let location = current.location;
  let precision = current.precision;
  let line = current.line;
  let source = current.source;

  if (selector && !location) {
    location = selector;
    precision = precision ?? "selector";
    source = source ?? "homepage-html";
    if (snippet) {
      line = line ?? lineInHtml(ctx, snippet.split("\n")[0] ?? snippet);
      if (line) precision = "line";
    }
  } else if (current.url?.endsWith("robots.txt") || finding.id === "robots-txt" || finding.id === "ai-crawlers") {
    source = source ?? "robots.txt";
    location = location ?? "robots.txt";
    precision = precision ?? (line ? "line" : "document");
  } else if (finding.id === "sitemap") {
    source = source ?? "sitemap.xml";
    location = location ?? "sitemap.xml";
    precision = precision ?? "document";
  } else if (finding.id.startsWith("llms")) {
    source = source ?? finding.id === "llms-full-txt" ? "/llms-full.txt" : "/llms.txt";
    location = location ?? source;
    precision = precision ?? "url";
  } else if (current.url && !location) {
    location = "Homepage analysis";
    precision = precision ?? "url";
    source = source ?? "homepage-html";
  } else if (!location) {
    location = "Homepage HTML";
    precision = precision ?? "document";
    source = source ?? "homepage-html";
  }

  return {
    ...current,
    snippet: snippet ? clip(snippet) : current.snippet,
    location,
    precision,
    line,
    source,
    url: current.url ?? ctx.page.finalUrl,
  };
}

export function enrichFinding(finding: Finding, ctx: AnalyzerContext): Finding {
  const evidence = enhanceEvidence(finding, ctx);
  return {
    ...finding,
    evidence,
    whyItMatters: finding.whyItMatters ?? WHY[finding.id],
    recommendedFix: finding.recommendedFix ?? defaultFix(ctx, finding),
    detectedSnippet:
      finding.detectedSnippet ??
      (finding.id === "links" && evidence.value && !evidence.value.startsWith("http")
        ? `<a href="/…">${evidence.value.split(",")[0]?.trim()}</a>`
        : evidence.snippet),
    affectedPages: finding.affectedPages ?? [ctx.page.finalUrl],
  };
}
