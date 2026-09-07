import { expect, test, type Page } from "@playwright/test";

const result = {
  url: "https://example.com/",
  timestamp: "2026-09-07T00:42:00.000Z",
  score: 82,
  grade: "good",
  categories: [
    { id: "crawlability", name: "Crawlability", emoji: "🕷", score: 92, weight: 0.2 },
    { id: "content-access", name: "Content Access", emoji: "📄", score: 84, weight: 0.15 },
    { id: "semantic-html", name: "Semantic HTML", emoji: "🧱", score: 88, weight: 0.15 },
    { id: "structured-data", name: "Structured Data", emoji: "🏷", score: 91, weight: 0.15 },
    { id: "llm-discoverability", name: "LLM Discoverability", emoji: "🧠", score: 72, weight: 0.1 },
    { id: "agent-ux", name: "Agent UX", emoji: "🔗", score: 79, weight: 0.15 },
    { id: "technical-seo", name: "Technical SEO", emoji: "⚙️", score: 94, weight: 0.1 },
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
      recommendation: "Add a canonical link.",
      whyItMatters: "A canonical URL tells machines which address is preferred.",
      recommendedFix: '<link rel="canonical" href="https://example.com/" />',
      detectedSnippet: "<head>…</head>",
      evidence: { location: "<head>", selector: 'link[rel="canonical"]', precision: "selector" },
      scoreImpact: 3,
      affectedPages: ["https://example.com/"],
    },
    {
      id: "https",
      category: "crawlability",
      title: "HTTPS",
      description: "The page is served over HTTPS.",
      severity: "pass",
      score: 8,
      maxScore: 8,
      evidence: { location: "Homepage analysis", precision: "url" },
    },
  ],
  technical: {
    https: true,
    statusCode: 200,
    redirectCount: 0,
    finalUrl: "https://example.com/",
    responseTimeMs: 10,
    responseBytes: 100,
  },
  crawler: {
    robotsTxt: { fetched: false, parseErrors: [], groups: [], sitemaps: [], crawlers: [] },
    sitemap: {
      fetched: false,
      validXml: false,
      urlCount: 0,
      sameOriginCount: 0,
      lastmodCount: 0,
      declaredInRobots: false,
      parseErrors: [],
    },
    llmsTxt: { path: "/llms.txt", fetched: false, hasTitle: false, hasDescription: false, linkCount: 0 },
    llmsFullTxt: {
      path: "/llms-full.txt",
      fetched: false,
      hasTitle: false,
      hasDescription: false,
      linkCount: 0,
    },
  },
  recommendations: [],
  insights: {
    summary: "Your website scored 82/100 (Good). It is generally accessible to machine-readable systems.",
    strongest: ["Technical SEO", "Structured Data"],
    weakest: ["LLM Discoverability"],
    topActions: [
      { id: "canonical", title: "Canonical URL", severity: "warning", scoreImpact: 3, affectedPages: 1 },
    ],
  },
} as const;

async function mockAnalyze(page: Page) {
  await page.route("**/api/analyze/stream", async (route) => {
    const id = "aHR0cHM6Ly9leGFtcGxlLmNvbS8";
    const body = `event: stage\ndata: ${JSON.stringify({ stage: "fetching-homepage" })}\n\nevent: result\ndata: ${JSON.stringify({ id, result })}\n\n`;
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      body,
    });
  });
}

test("landing page shows analyzer form", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /AI Agent Readiness/i })).toBeVisible();
  await expect(page.getByLabel("Website URL")).toBeVisible();
  await expect(page.getByRole("button", { name: "Analyze Website" })).toBeVisible();
});

test("analyze opens a report, finding, evidence, copy fix, and warning filter", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-write", "clipboard-read"]);
  await mockAnalyze(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Analyze Website" }).click();
  await expect(page.getByRole("heading", { name: "AI Readiness" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("82", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /Canonical URL/ }).first().click();
  await expect(page.getByText("Why it matters")).toBeVisible();
  await expect(page.getByText("Recommended fix")).toBeVisible();
  await page.getByRole("button", { name: "Copy fix" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  await page.getByRole("button", { name: "Warning" }).click();
  await expect(page.getByText("Canonical URL").first()).toBeVisible();
});
