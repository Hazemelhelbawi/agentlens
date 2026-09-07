import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contextFromHtml, getRule, runRules } from "./index.js";
import { analyzeRobotsTxt } from "@agentlens/crawler";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures");

function load(name: string): string {
  return readFileSync(join(fixtures, name), "utf8");
}

async function run(id: string, html: string, options?: Parameters<typeof contextFromHtml>[1]) {
  const rule = getRule(id);
  if (!rule) throw new Error(`missing rule ${id}`);
  return rule.check(contextFromHtml(html, options));
}

describe("analyzer rules", () => {
  it("scores an excellent page highly across categories", async () => {
    const html = load("excellent/index.html");
    const ctx = contextFromHtml(html, {
      crawler: {
        robotsTxt: analyzeRobotsTxt(load("excellent/robots.txt"), 200),
        sitemap: {
          fetched: true,
          validXml: true,
          urlCount: 2,
          sameOriginCount: 2,
          lastmodCount: 2,
          declaredInRobots: true,
          parseErrors: [],
          statusCode: 200,
        },
        llmsTxt: {
          path: "/llms.txt",
          fetched: true,
          hasTitle: true,
          hasDescription: true,
          linkCount: 2,
          statusCode: 200,
        },
        llmsFullTxt: {
          path: "/llms-full.txt",
          fetched: true,
          hasTitle: true,
          hasDescription: true,
          linkCount: 1,
          statusCode: 200,
        },
      },
    });
    const findings = await runRules(ctx.crawl);
    const title = findings.find((f) => f.id === "title");
    expect(title?.severity).toBe("pass");
    expect(title?.description).toMatch(/characters/);
    const h = findings.find((f) => f.id === "headings");
    expect(h?.description).toMatch(/H1: 1/);
    expect(findings.find((f) => f.id === "json-ld")?.severity).toBe("pass");
  });

  it("analyzes metadata, headings, semantic HTML, and links on poor pages", async () => {
    const html = load("poor/index.html");
    const [title] = await run("title", html);
    expect(title?.severity).toBe("critical");
    const [csr] = await run("csr-detection", html);
    expect(csr?.description).toMatch(/Potential client-rendered content detected/);
    const [links] = await run("links", html);
    expect(links?.description.toLowerCase()).toMatch(/generic|empty/);
    const [images] = await run("images-alt", html);
    expect(images?.severity).not.toBe("pass");
  });

  it("is conservative about JS-heavy shells", async () => {
    const [finding] = await run("csr-detection", load("js-heavy/index.html"));
    expect(finding?.description).toMatch(/Potential client-rendered content detected/);
    expect(finding?.description).not.toMatch(/AI cannot read/);
  });

  it("flags unnamed or generic buttons", async () => {
    const [finding] = await run(
      "interactive",
      `<html><body><button>Click here</button><button aria-label="Start free trial"></button></body></html>`,
    );
    expect(finding?.id).toBe("interactive");
    expect(finding?.description).toMatch(/Click here/);
    expect(finding?.severity).not.toBe("pass");
  });

  it("parses broken HTML without throwing", async () => {
    const findings = await runRules(contextFromHtml(load("broken-html/index.html")).crawl);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("parses malformed JSON-LD as a finding", async () => {
    const [finding] = await run("json-ld", load("malformed-jsonld/index.html"));
    expect(finding?.severity).toBe("critical");
    expect(finding?.description.toLowerCase()).toMatch(/malformed/);
  });

  it("describes missing llms.txt as an emerging convention", async () => {
    const [finding] = await run("llms-txt", load("missing-files/index.html"));
    expect(finding?.description).toMatch(/No llms.txt detected/);
    expect(finding?.description).toMatch(/emerging convention/);
    expect(finding?.description).not.toMatch(/not AI-ready because/i);
  });

  it("reports AI crawler blocks from robots.txt", async () => {
    const robots = analyzeRobotsTxt(load("blocked-crawlers/robots.txt"), 200);
    const [finding] = await run("ai-crawlers", "<html></html>", { crawler: { robotsTxt: robots } });
    expect(finding?.description).toMatch(/GPTBot/);
    expect(finding?.severity).toBe("warning");
  });

  it("attaches location evidence without inventing line numbers", async () => {
    const html = load("excellent/index.html");
    const ctx = contextFromHtml(html);
    const findings = await runRules(ctx.crawl);
    const title = findings.find((f) => f.id === "title");
    expect(title?.evidence?.selector).toBe("title");
    expect(title?.evidence?.location).toBeTruthy();
    expect(title?.whyItMatters).toMatch(/title/i);
    if (title?.evidence?.line !== undefined) {
      expect(title.evidence.line).toBeGreaterThan(0);
      expect(title.evidence.precision).toBe("line");
    } else {
      expect(title?.evidence?.precision).not.toBe("line");
    }
  });

  it("does not claim guaranteed access for unspecified crawlers", async () => {
    const robots = analyzeRobotsTxt("User-agent: *\nAllow: /\n", 200);
    const gpt = robots.crawlers.find((c) => c.name === "GPTBot");
    expect(gpt?.detail).toBe("No explicit restriction detected");
  });
});
