# Architecture

```text
                    AgentLens Core
                         │
          ┌──────────────┼──────────────┐
          │              │              │
      GitHub Action     CLI          Web App
          │              │              │
          └──────────────┼──────────────┘
                         │
                    JSON Results
```

| Path | Role |
| --- | --- |
| `packages/shared` | Types, Zod schema, category weights |
| `packages/crawler` | SSRF, fetch, robots, sitemap, llms.txt |
| `packages/analyzer` | Rules + registry |
| `packages/scoring` | Weighted score, grade, fail-under |
| `packages/core` | `analyzeWebsite()` |
| `packages/ai` | Optional explanations of existing findings |
| `action/` | GitHub Action (bundled to `action/dist/index.cjs`) |
| `cli/` | `npx agentlens` |
| `apps/web` | Landing page, `/report/[id]`, `/api/badge` |

`analyzeWebsite` never calls an LLM. AI adapters live behind `createAIProvider()` and require an explicit key.
