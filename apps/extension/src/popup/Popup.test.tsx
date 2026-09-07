/** @vitest-environment happy-dom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AnalysisResult } from "@agentlens/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("chrome", {
  runtime: {
    sendMessage: vi.fn(),
    connect: vi.fn(),
  },
});
import { Popup } from "./Popup.js";
import { IssueCard } from "../components/issue-card.js";
import { LoadingState } from "../components/loading-state.js";
import { ErrorState } from "../components/error-state.js";
import { ScoreRing } from "../components/score-ring.js";

const result = {
  url: "https://example.com/",
  timestamp: "2026-09-07T00:00:00.000Z",
  score: 82,
  grade: "good",
  categories: [
    { id: "crawlability", name: "Crawlability", emoji: "", score: 90, weight: 0.2 },
    { id: "content-access", name: "Content Access", emoji: "", score: 80, weight: 0.15 },
    { id: "semantic-html", name: "Semantic HTML", emoji: "", score: 80, weight: 0.15 },
    { id: "structured-data", name: "Structured Data", emoji: "", score: 70, weight: 0.15 },
    { id: "llm-discoverability", name: "LLM Discoverability", emoji: "", score: 60, weight: 0.1 },
    { id: "agent-ux", name: "Agent UX", emoji: "", score: 70, weight: 0.15 },
    { id: "technical-seo", name: "Technical SEO", emoji: "", score: 90, weight: 0.1 },
  ],
  findings: [
    {
      id: "canonical",
      category: "crawlability",
      title: "Canonical URL",
      description: "No canonical link tag was found.",
      severity: "warning",
      score: 3,
      maxScore: 8,
      whyItMatters: "Machines need a preferred URL.",
      recommendedFix: '<link rel="canonical" href="https://example.com/" />',
      evidence: { selector: "head", location: "head", precision: "selector", inspectable: true },
      inspectTargets: [{ ruleId: "canonical", selector: "head", unique: true, tagName: "head" }],
    },
    {
      id: "https",
      category: "crawlability",
      title: "HTTPS",
      description: "The page is served over HTTPS.",
      severity: "pass",
      score: 8,
      maxScore: 8,
    },
  ],
  technical: { https: true, statusCode: 200, redirectCount: 0, finalUrl: "https://example.com/", responseTimeMs: 1, responseBytes: 10 },
  crawler: {
    robotsTxt: { fetched: false, parseErrors: [], groups: [], sitemaps: [], crawlers: [] },
    sitemap: { fetched: false, validXml: false, urlCount: 0, sameOriginCount: 0, lastmodCount: 0, declaredInRobots: false, parseErrors: [] },
    llmsTxt: { path: "/llms.txt", fetched: true, hasTitle: true, hasDescription: true, linkCount: 1 },
    llmsFullTxt: { path: "/llms-full.txt", fetched: false, hasTitle: false, hasDescription: false, linkCount: 0 },
  },
  recommendations: [],
  insights: { summary: "Your website scored 82/100 (Good).", strongest: ["Technical SEO"], weakest: ["LLM Discoverability"], topActions: [] },
  breakdown: [
    { id: "crawlability", name: "Crawlability", weight: 0.2, score: 90, points: 18, checks: [] },
  ],
  inspection: {
    headings: [{ level: 1, text: "Example", tag: "h1", unique: true, selector: "h1" }],
    headingCounts: { h1: 1, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
    headingWarnings: [],
    landmarks: { main: 1 },
    links: { total: 1, descriptive: 0, generic: 1, empty: 0, issues: [{ href: "/x", text: "Learn more", kind: "generic" }] },
    linkIndex: {
      total: 1, internal: 1, external: 0, unknownOrigin: 0, nofollow: 0, sponsored: 0, ugc: 0,
      generic: 1, empty: 0, javascript: 0, imageOnly: 0,
      items: [{ href: "/pricing", text: "Learn more", kind: "generic", unique: true, selector: "a" }],
    },
    images: { total: 1, withAlt: 0, missingAlt: 1, emptyAlt: 0, decorative: 0, issues: [{ src: "/hero.jpg", kind: "missing" }] },
    imageIndex: {
      total: 1, withAlt: 0, missingAlt: 1, emptyAlt: 0, decorative: 0, withDimensions: 0,
      withoutDimensions: 1, lazy: 0, imageLinks: 0,
      items: [{ src: "/hero.jpg", altKind: "missing", unique: true, selector: "img" }],
    },
    jsonLd: [{ index: 0, types: ["WebSite"], valid: true, raw: '{"@type":"WebSite"}', missingFields: [] }],
    schema: { jsonLdCount: 1, microdataCount: 0, rdfaCount: 0, types: ["WebSite"] },
    sitemapUrls: [{ loc: "https://example.com/", sameOrigin: true, lastmod: "2026-01-01" }],
    sitemapMeta: {
      status: "found", url: "https://example.com/sitemap.xml", isIndex: false, urlCount: 1,
      childSitemaps: [], duplicateCount: 0, missingLocCount: 0, invalidUrlCount: 0,
    },
    robotsRaw: "User-agent: *\nAllow: /\n",
    robotsDetail: { status: "found", url: "https://example.com/robots.txt", host: [], otherDirectives: [] },
    seo: {
      url: { href: "https://example.com/", protocol: "https", https: true, hostname: "example.com", pathname: "/" },
      title: { value: "Example", length: 7, status: "pass", notes: ["Title exists"] },
      description: { value: "Example page", length: 12, status: "pass", notes: ["Description exists"] },
      canonical: { href: "https://example.com/", count: 0, status: "fail", notes: ["Missing canonical"] },
      robotsMeta: { content: "index, follow", directives: ["index", "follow"] },
      language: { value: "en", status: "pass", notes: [] },
      charset: { value: "UTF-8", status: "pass", notes: [] },
      viewport: { value: "width=device-width", status: "pass", notes: [] },
    },
    pages: [],
  },
  domStats: { links: 1, buttons: 0, images: 0, headings: 1, forms: 0, jsonLd: 0, inputs: 0 },
} as unknown as AnalysisResult;

function mockPort(sendResult = true) {
  const listeners: Array<(message: unknown) => void> = [];
  return {
    onMessage: { addListener: (fn: (message: unknown) => void) => listeners.push(fn) },
    postMessage: vi.fn(() => {
      if (sendResult) {
        queueMicrotask(() => listeners.forEach((fn) => fn({ type: "RESULT", result })));
      }
    }),
    disconnect: vi.fn(),
  } as unknown as chrome.runtime.Port;
}

describe("popup UI", () => {
  beforeEach(() => {
    window.close = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders score, categories, and issues from real analysis data", async () => {
    render(<Popup connect={() => mockPort()} />);
    expect(await screen.findByText(/82 \/ 100/)).toBeTruthy();
    expect(screen.getByText("Crawlability")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Issues" }));
    expect(screen.getByText("Canonical URL")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Canonical URL/ }));
    expect(screen.getByText("Why")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy fix" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inspect" })).toBeTruthy();
  });

  it("shows loading stages without a fake percentage", () => {
    render(<LoadingState stage="reading-dom" host="example.com" />);
    expect(screen.getAllByText("Collecting rendered DOM").length).toBeGreaterThan(0);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("shows a human-readable error", () => {
    render(
      <ErrorState
        error={{ title: "AgentLens can't inspect this page.", reason: "Chrome does not allow extensions to inspect browser-internal pages." }}
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByText(/can't inspect this page/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try another page" })).toBeTruthy();
  });

  it("describes the score ring accessibly", () => {
    render(<ScoreRing score={87} grade="good" />);
    expect(screen.getByRole("img", { name: /87 out of 100/ })).toBeTruthy();
  });

  it("cycles the theme control", async () => {
    render(<Popup connect={() => mockPort()} />);
    await screen.findByText(/82 \/ 100/);
    const theme = screen.getByRole("button", { name: "Toggle color theme" });
    fireEvent.click(theme);
    expect(theme.textContent).toMatch(/Light|Dark|Auto/);
  });

  it("exports the cached result without re-analyzing", async () => {
    render(<Popup connect={() => mockPort()} />);
    await screen.findByText(/82 \/ 100/);
    expect(screen.getByRole("button", { name: "Export JSON" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Markdown" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open full report" })).toBeTruthy();
  });

  it("inspects a unique heading from the SEO tree", async () => {
    render(<Popup connect={() => mockPort()} />);
    await screen.findByText(/82 \/ 100/);
    fireEvent.click(screen.getByRole("tab", { name: "SEO" }));
    fireEvent.click(screen.getByRole("tab", { name: "Headings" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Inspect" })[0]!);
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });

  it("can show passed checks when that filter is selected", async () => {
    render(<Popup connect={() => mockPort()} />);
    await screen.findByText(/82 \/ 100/);
    fireEvent.click(screen.getByRole("tab", { name: "Issues" }));
    fireEvent.click(screen.getByRole("button", { name: "Passed" }));
    expect(screen.getByText("HTTPS")).toBeTruthy();
  });

  it("copies the recommended fix", async () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(
      <IssueCard
        finding={result.findings[0]!}
        detailed
        onInspect={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Canonical URL/ }));
    fireEvent.click(screen.getByRole("button", { name: "Copy fix" }));
    expect(writeText).toHaveBeenCalledWith('<link rel="canonical" href="https://example.com/" />');
  });

  it("shows SEO, headings, links, images, schema, robots, sitemap, and AI sections", async () => {
    render(<Popup connect={() => mockPort()} />);
    await screen.findByText(/82 \/ 100/);
    expect(screen.getByText("SEO health")).toBeTruthy();
    expect(screen.getByText("AI agent summary")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "SEO" }));
    expect(screen.getByText("Example")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Headings" }));
    expect(screen.getByText("H1 · 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Links" }));
    expect(screen.getByText("/pricing")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Images" }));
    expect(screen.getByText("/hero.jpg")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Schema" }));
    expect(screen.getAllByText("WebSite").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Copy JSON" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Robots" }));
    expect(screen.getByText("https://example.com/robots.txt")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Sitemap" }));
    expect(screen.getByText("1 URLs")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "AI / Agents" }));
    expect(screen.getByText("llms.txt")).toBeTruthy();
    expect(screen.getByText("Agent UX")).toBeTruthy();
  });

  it("does not claim success when copy fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    document.execCommand = () => false;
    render(<IssueCard finding={result.findings[0]!} detailed onInspect={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy fix" }));
    expect(await screen.findByRole("button", { name: "Copy failed" })).toBeTruthy();
  });
});
