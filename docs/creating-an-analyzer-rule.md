# Creating an analyzer rule

AgentLens is designed so a new rule is a small, reviewable PR.

## Steps

1. Create rule
2. Add test
3. Add fixture
4. Register rule
5. Run tests
6. Open PR

## 1. Create the rule

Rules live in `packages/analyzer/src/rules/`. Each rule implements `AnalyzerRule`:

```ts
import type { AnalyzerRule } from "../types.js";
import { finding } from "../types.js";

export const missingLlmsTxtRule: AnalyzerRule = {
  id: "missing-llms-txt",
  category: "llm-discoverability",
  async check(context) {
    const present = context.crawl.crawler.llmsTxt.fetched;
    return [
      finding({
        id: "missing-llms-txt",
        category: "llm-discoverability",
        title: "llms.txt",
        description: present
          ? "/llms.txt was found."
          : "No llms.txt detected. This emerging convention can provide an additional machine-readable description of your website.",
        severity: present ? "pass" : "info",
        score: present ? 10 : 4,
        maxScore: 10,
        recommendation: present
          ? undefined
          : "Consider adding /llms.txt with a title, short description, and links.",
      }),
    ];
  },
};
```

`check` may be sync or async. Return one or more `Finding` objects. Points must be earned from evidence you actually inspected.

## 2. Add a test

```ts
import { describe, expect, it } from "vitest";
import { contextFromHtml, getRule } from "../index.js";

it("does not claim the site is not AI-ready", async () => {
  const rule = getRule("missing-llms-txt");
  const [finding] = await rule.check(contextFromHtml("<html></html>"));
  expect(finding.description).not.toMatch(/not AI-ready/);
});
```

## 3. Add a fixture

Put HTML or `robots.txt` samples in `fixtures/<scenario>/`.

## 4. Register the rule

Export it from the category file and add it to the `rules` array in `packages/analyzer/src/rules/index.ts`.

## 5. Run tests

```bash
pnpm test
pnpm typecheck
```

## 6. Open a PR

Describe the heuristic, the max score, and why the wording is conservative.

## Rules of the road

- No AI API calls inside a rule.
- No claims about official search-engine or model rankings.
- Do not treat missing `llms.txt` as a hard failure of “AI readiness”.
- Do not invent file paths for GitHub annotations.
