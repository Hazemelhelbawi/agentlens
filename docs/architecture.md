# Architecture

```text
                         AgentLens Core
                              │
             ┌────────────────┼────────────────┐
             │                │                │
        Chrome Extension   GitHub Action      CLI
             │                │                │
             └────────────────┼────────────────┘
                              │
                       Shared Analyzer
                              │
                       Shared Scoring
                              │
                         JSON Results
```

The web app (`apps/web`) is another UI on the same core. It is not a second analyzer.

| Path | Role |
| --- | --- |
| `packages/shared` | Types, Zod schema, category weights |
| `packages/crawler` | SSRF, fetch, robots, sitemap, llms.txt |
| `packages/analyzer` | Rules + registry |
| `packages/scoring` | Weighted score, grade, fail-under |
| `packages/core` | `analyzeWebsite()` |
| `packages/ai` | Optional explanations of existing findings |
| `action/` | GitHub Action (bundled to `action/dist/index.cjs`) |
| `cli/` | CLI (`node cli/dist/cli.js`, intended `npx agentlens`) |
| `apps/extension` | Chrome Extension (current-tab UI) |
| `apps/web` | Landing page, `/report/[id]`, `/api/badge` |

`analyzeWebsite` never calls an LLM. AI adapters live behind `createAIProvider()` and require an explicit key.
