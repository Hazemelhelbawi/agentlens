import { describe, expect, it } from "vitest";
import { collectLiveTargets, uniqueCssPath } from "./collect.js";

describe("DOM evidence", () => {
  it("returns a unique selector for an id", () => {
    document.body.innerHTML = `<a id="pricing" href="/pricing">Learn more</a>`;
    const el = document.querySelector("#pricing");
    expect(el).toBeTruthy();
    const located = uniqueCssPath(el!);
    expect(located.unique).toBe(true);
    expect(located.selector).toBe("#pricing");
  });

  it("collects generic links as inspect targets", () => {
    document.body.innerHTML = `<a href="/x">Learn more</a><a href="/y">Documentation</a>`;
    const targets = collectLiveTargets();
    expect(targets.some((item) => item.ruleId === "links" && item.text === "Learn more")).toBe(true);
    expect(targets.some((item) => item.text === "Documentation")).toBe(false);
  });
});
