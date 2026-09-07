import { describe, expect, it } from "vitest";
import { uniqueLineOf } from "./evidence.js";
import { buildInspection } from "./inspection.js";
import { contextFromHtml, runRules } from "./index.js";

describe("evidence helpers", () => {
  it("returns a 1-based line only when the needle is unique", () => {
    const source = "one\ntwo\nthree\n";
    expect(uniqueLineOf(source, "two")).toBe(2);
    expect(uniqueLineOf("aa\naa\n", "aa")).toBeUndefined();
    expect(uniqueLineOf("hello", "missing")).toBeUndefined();
  });

  it("builds an inspection from homepage HTML", () => {
    const ctx = contextFromHtml(
      `<html><head><title>Docs</title></head><body><header></header><main><h1>Docs</h1><a href="/pricing">Click here</a><img src="/x.png"></main></body></html>`,
    );
    const inspection = buildInspection(ctx.crawl);
    expect(inspection.headings[0]?.text).toBe("Docs");
    expect(inspection.landmarks.main).toBe(1);
    expect(inspection.links.generic).toBe(1);
    expect(inspection.images.missingAlt).toBe(1);
    expect(inspection.pages[0]?.title).toBe("Docs");
  });

  it("enriches findings with whyItMatters and a location label", async () => {
    const ctx = contextFromHtml("<html><head></head><body><p>Hi</p></body></html>");
    const findings = await runRules(ctx.crawl);
    const title = findings.find((item) => item.id === "title");
    expect(title?.whyItMatters).toBeTruthy();
    expect(title?.evidence?.location).toBeTruthy();
    expect(title?.evidence?.precision).not.toBe("line");
  });
});
