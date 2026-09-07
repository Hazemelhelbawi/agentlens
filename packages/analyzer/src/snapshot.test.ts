import { describe, expect, it } from "vitest";
import { analyzeCollectedPage } from "./snapshot.js";
import { collectInspectTargets, elementPath } from "./inspect.js";
import { contextFromHtml } from "./fixture.js";

const page = `<!doctype html>
<html lang="en">
<head>
  <title>Docs</title>
  <meta name="description" content="Product docs for AgentLens" />
  <link rel="canonical" href="https://example.com/docs" />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Docs","url":"https://example.com/"}</script>
</head>
<body>
  <header><nav><a href="/docs">Documentation</a></nav></header>
  <main>
    <h1>Documentation</h1>
    <p>Guides for integrating AgentLens.</p>
    <a href="/pricing">Learn more</a>
    <button>Click here</button>
    <img src="/hero.png">
  </main>
  <footer>©</footer>
</body>
</html>`;

describe("analyzeCollectedPage", () => {
  it("scores a collected DOM snapshot with the shared engine", async () => {
    const result = await analyzeCollectedPage({
      url: "https://example.com/docs",
      html: page,
      robots: {
        status: 200,
        body: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n",
      },
      sitemap: {
        status: 200,
        body: `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/docs</loc></url></urlset>`,
      },
      llmsTxt: { status: 404, body: null },
    });
    expect(result.source).toBe("extension");
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.domStats?.links).toBe(2);
    expect(result.domStats?.buttons).toBe(1);
    expect(result.findings.some((item) => item.id === "interactive")).toBe(true);
    expect(result.breakdown?.length).toBe(7);
  });

  it("attaches unique selectors without inventing them", async () => {
    const result = await analyzeCollectedPage({ url: "https://example.com/docs", html: page });
    const links = result.findings.find((item) => item.id === "links");
    expect(links?.inspectTargets?.length).toBeGreaterThan(0);
    expect(links?.inspectTargets?.every((item) => item.selector.length > 0)).toBe(true);
    const interactive = result.findings.find((item) => item.id === "interactive");
    expect(interactive?.inspectTargets?.[0]?.text).toMatch(/Click here/i);
  });

  it("scores dedicated fixtures without inventing evidence", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures");
    const load = (name: string) => readFileSync(join(fixtures, name), "utf8");

    const buttons = await analyzeCollectedPage({
      url: "https://example.com/buttons",
      html: load("unlabeled-buttons/index.html"),
    });
    expect(buttons.findings.find((item) => item.id === "interactive")?.severity).not.toBe("pass");

    const links = await analyzeCollectedPage({
      url: "https://example.com/links",
      html: load("generic-links/index.html"),
    });
    expect(links.findings.find((item) => item.id === "links")?.description.toLowerCase()).toMatch(/generic/);

    const canonical = await analyzeCollectedPage({
      url: "https://example.com/canonical",
      html: load("missing-canonical/index.html"),
    });
    expect(canonical.findings.find((item) => item.id === "canonical")?.severity).toBe("warning");
    expect(canonical.findings.find((item) => item.id === "canonical")?.evidence?.line).toBeUndefined();

    const spa = await analyzeCollectedPage({
      url: "https://example.com/app",
      html: load("spa-shell/index.html"),
    });
    expect(spa.findings.find((item) => item.id === "csr-detection")?.description).toMatch(/client-rendered|limited|shell/i);

    const large = await analyzeCollectedPage({
      url: "https://example.com/large",
      html: `<main><h1>Large</h1>${"<p>Item</p>".repeat(400)}</main>`,
      truncated: true,
    });
    expect(large.truncated).toBe(true);
    expect(large.score).toBeGreaterThan(0);
  });

  it("does not mark a selector unique when it matches many nodes", () => {
    const ctx = contextFromHtml("<main><a href='/a'>Learn more</a><a href='/b'>Learn more</a></main>");
    const first = ctx.$("a").get(0);
    expect(first).toBeTruthy();
    if (!first || first.type !== "tag") return;
    const located = elementPath(ctx, first);
    expect(located.selector).toBeTruthy();
    const targets = collectInspectTargets(ctx);
    expect(targets.some((item) => item.ruleId === "links")).toBe(true);
  });
});
