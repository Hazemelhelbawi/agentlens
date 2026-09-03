import { describe, expect, it } from "vitest";
import { failUnder, scoreFindings } from "./index.js";
import type { Finding } from "@agentlens/shared";

function f(partial: Partial<Finding> & Pick<Finding, "id" | "category" | "score" | "maxScore">): Finding {
  return {
    title: partial.id,
    description: "",
    severity: "pass",
    ...partial,
  };
}

describe("scoring", () => {
  it("weights categories and traces points to findings", () => {
    const findings: Finding[] = [
      f({ id: "a", category: "crawlability", score: 20, maxScore: 20 }),
      f({ id: "b", category: "content-access", score: 15, maxScore: 15 }),
      f({ id: "c", category: "semantic-html", score: 15, maxScore: 15 }),
      f({ id: "d", category: "structured-data", score: 15, maxScore: 15 }),
      f({ id: "e", category: "llm-discoverability", score: 10, maxScore: 10 }),
      f({ id: "f", category: "agent-ux", score: 15, maxScore: 15 }),
      f({ id: "g", category: "technical-seo", score: 10, maxScore: 10 }),
    ];
    const result = scoreFindings(findings);
    expect(result.score).toBe(100);
    expect(result.grade).toBe("excellent");
    expect(result.categories).toHaveLength(7);
  });

  it("assigns grades using the documented bands", () => {
    const make = (ratio: number): Finding[] =>
      [
        "crawlability",
        "content-access",
        "semantic-html",
        "structured-data",
        "llm-discoverability",
        "agent-ux",
        "technical-seo",
      ].map((category) =>
        f({
          id: category,
          category: category as Finding["category"],
          score: ratio,
          maxScore: 100,
        }),
      );

    expect(scoreFindings(make(30)).grade).toBe("poor");
    expect(scoreFindings(make(45)).grade).toBe("needs-work");
    expect(scoreFindings(make(70)).grade).toBe("fair");
    expect(scoreFindings(make(80)).grade).toBe("good");
    expect(scoreFindings(make(95)).grade).toBe("excellent");
  });

  it("implements fail-under as score < threshold", () => {
    expect(failUnder(75, 75)).toBe(false);
    expect(failUnder(74, 75)).toBe(true);
    expect(failUnder(68, 75)).toBe(true);
  });
});
