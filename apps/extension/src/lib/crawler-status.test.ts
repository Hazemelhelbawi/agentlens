import { describe, expect, it } from "vitest";
import { accessToRule, crawlerLabel, ruleFromGroups } from "./crawler-status.js";

describe("crawler status display", () => {
  it("does not label unspecified crawlers as allowed", () => {
    expect(
      accessToRule(
        { name: "GPTBot", status: "unspecified", detail: "No explicit restriction detected" },
        "found",
      ),
    ).toBe("no-specific-rule");
    expect(crawlerLabel("no-specific-rule")).toBe("No specific rule");
    expect(crawlerLabel("allowed")).toBe("Allowed");
    expect(crawlerLabel("blocked")).toBe("Blocked");
    expect(crawlerLabel("unknown")).toBe("Unknown");
  });

  it("marks explicit disallow / as blocked", () => {
    expect(
      ruleFromGroups([{ userAgents: ["GPTBot"], allow: [], disallow: ["/"] }], "GPTBot", "found"),
    ).toBe("blocked");
    expect(ruleFromGroups([], "Googlebot", "found")).toBe("no-specific-rule");
    expect(ruleFromGroups([], "Googlebot", "error")).toBe("unknown");
  });
});
