# 🤖 AgentLens

### See how AI agents see your website.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/hazemelhelbawi/agentlens/actions/workflows/ci.yml/badge.svg)](https://github.com/hazemelhelbawi/agentlens/actions/workflows/ci.yml)

GitHub Action · CLI · heuristic AI-readiness score · no AI API key

```yaml
- uses: hazemelhelbawi/agentlens@v1
  with:
    url: https://example.com
```

That is the whole product. Add the Action to a pull request and AgentLens posts a report:

```text
🤖 AgentLens

AI Readiness: 82/100
Grade: GOOD

━━━━━━━━━━━━━━━━━━━━

🕷 Crawlability        92
📄 Content Access      84
🧱 Semantic HTML       88
🏷 Structured Data      91
🧠 LLM Discoverability 72
🔗 Agent UX            79
⚙️ Technical SEO       94

━━━━━━━━━━━━━━━━━━━━

⚠️ 3 recommendations

• Missing llms.txt
• Missing Organization JSON-LD
• 7 generic link labels
```

The number is a **heuristic developer-oriented score**. It is not an official ranking from OpenAI, Google, Anthropic, or any search engine.

---

## What is AgentLens?

AgentLens inspects a public URL the way a fetch-based agent would: HTML, `robots.txt`, `sitemap.xml`, metadata, JSON-LD, and optional `llms.txt`. It returns findings, a transparent category breakdown, and recommendations.

It exists because AI crawlers and coding agents already visit websites, and most sites are still designed only for browsers. AgentLens makes that gap visible in the place developers already review work: GitHub pull requests.

## Features

- **GitHub Action** — PR comment, job summary, optional score gate
- **CLI** — `npx agentlens https://example.com`
- **Deterministic rules** — no model, no API key
- **SSRF-safe crawler** — public `http`/`https` only
- **Stable JSON** — build other tools on the same result
- **Extensible analyzers** — add a rule, a fixture, and a test

## Installation

### GitHub Action

```yaml
name: AgentLens

on:
  pull_request:
  push:

permissions:
  contents: read
  pull-requests: write

jobs:
  agentlens:
    runs-on: ubuntu-latest
    steps:
      - uses: hazemelhelbawi/agentlens@v1
        with:
          url: https://example.com
          fail-under: 75
```

### CLI

```bash
npx agentlens https://example.com
npx agentlens https://example.com --json
npx agentlens https://example.com --fail-under 80
```

From this repository:

```bash
pnpm install
pnpm build
node cli/dist/cli.js https://example.com
```

## GitHub Action inputs

| Input | Default | Description |
| --- | --- | --- |
| `url` | required | Public `http(s)` URL |
| `fail-under` | `0` | Fail the job when the score is below this value. `0` disables the gate. |
| `comment` | `true` | Create or update a PR comment (`<!-- agentlens-report -->`) |
| `annotations` | `true` | File annotations **only** when evidence maps to a repo file |
| `pages` | `0` | Extra same-origin pages (homepage + well-known files are always fetched) |
| `github-token` | `${{ github.token }}` | Used for PR comments |

Outputs: `score`, `grade`, `json`.

The Action writes a [job summary](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary) on every run.

## CLI

```text
🤖 AgentLens

Analyzing https://example.com...

✓ Crawlability         92
✓ Content Access       84
✓ Semantic HTML        88
✓ Structured Data      91
⚠ LLM Discoverability  72
✓ Agent UX             79
✓ Technical SEO        94

━━━━━━━━━━━━━━━━━━━━

82/100 — GOOD

3 recommendations found.
```

JSON mode is stable and includes `url`, `score`, `grade`, `categories`, `findings`, and `recommendations`.

## Scoring

Weights:

| Category | Weight |
| --- | --- |
| Crawlability | 20% |
| Content Access | 15% |
| Semantic HTML | 15% |
| Structured Data | 15% |
| LLM Discoverability | 10% |
| Agent UX | 15% |
| Technical SEO | 10% |

Each category score is `sum(finding.score) / sum(finding.maxScore)`. The overall score is the weighted average, rounded to an integer 0–100.

| Score | Grade |
| --- | --- |
| 0–39 | Poor |
| 40–59 | Needs Work |
| 60–74 | Fair |
| 75–89 | Good |
| 90–100 | Excellent |

Every point comes from a named finding. See [docs/scoring.md](docs/scoring.md).

## Analyzer rules

- **Crawlability** — HTTP status, HTTPS, redirects, robots.txt, sitemap.xml, canonical, indexability
- **Content access** — title, description, visible text, conservative CSR/shell detection
- **Semantic HTML** — headings, landmarks, images, forms
- **Structured data** — JSON-LD parse + common `@type` values (not full Schema.org validation)
- **LLM discoverability** — `llms.txt` / `llms-full.txt` as an **emerging convention**, AI crawler robots groups
- **Agent UX** — documented heuristic over navigation, links, landmarks, metadata, and structured data
- **Technical SEO** — viewport, Open Graph, Twitter tags, robots meta, response hygiene

`llms.txt` absence is never phrased as “your site is not AI-ready”.

## Security

The crawler is SSRF-hardened. It only allows `http:` / `https:`, blocks localhost and private/link-local addresses, re-validates redirects, and caps time, size, redirects, pages, and concurrency. Details: [docs/security.md](docs/security.md) and [SECURITY.md](SECURITY.md).

Default crawl: homepage + `/robots.txt` + `/sitemap.xml` + `/llms.txt` + `/llms-full.txt`. It does not spider the whole site.

## Architecture

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

Packages: `shared`, `crawler`, `analyzer`, `scoring`, `core`. Optional `packages/ai` explains existing findings and is never required.

## Badges

When the web app is deployed:

```md
[![AgentLens](https://your-domain.com/api/badge?url=https://example.com)](https://your-domain.com)
```

## Contributing

Adding a rule is the intended contribution path:

1. Create rule
2. Add test
3. Add fixture
4. Register rule
5. Run tests
6. Open PR

Guide: [docs/creating-an-analyzer-rule.md](docs/creating-an-analyzer-rule.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

### v0.1

- [x] Core analyzer
- [x] Scoring engine
- [x] robots.txt
- [x] sitemap.xml
- [x] metadata
- [x] semantic HTML
- [x] JSON-LD
- [x] llms.txt
- [x] GitHub Action
- [x] CLI

### v0.2

- [x] Conservative PR annotations (only when mapped to repo files)
- [x] Badges
- [x] Shareable reports
- [ ] More analyzer rules

### v0.3

- [ ] Optional AI explanations
- [ ] Automated fix suggestions
- [ ] Browser extension

### Future

- [ ] VS Code extension
- [ ] Historical scores
- [ ] Lighthouse integration
- [ ] Repository-level analysis
- [ ] More integrations

## License

MIT
