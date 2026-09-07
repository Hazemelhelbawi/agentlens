# 🤖 AgentLens

## See how AI agents see your website.

SEO + AI Agent Readiness Inspector for developers.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/Hazemelhelbawi/agentlens/actions/workflows/ci.yml/badge.svg)](https://github.com/Hazemelhelbawi/agentlens/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/Hazemelhelbawi/agentlens)](https://github.com/Hazemelhelbawi/agentlens/releases)

GitHub Action · CLI · Chrome Extension · deterministic analysis · no AI API key

AgentLens audits the things developers need to know when building websites that must be discoverable, understandable, and usable by search engines, AI crawlers, and agentic systems.

```text
Open any website → AgentLens → 87 / 100 → SEO · Schema · Robots · Sitemap → Inspect → Fix
```

---

## See it in action

Inspect your current page without leaving the browser.

A recorded demo and screenshots belong in [`docs/assets/`](docs/assets/README.md). They are not committed yet, so this README does not show a fabricated GIF.

<!-- Add docs/assets/agentlens-demo.gif when recorded from the real extension. -->
<!-- Add docs/assets/extension-overview.png when captured from the real popup. -->

Intended demo flow:

```text
Open website
      ↓
Open AgentLens
      ↓
See score
      ↓
SEO → Schema → Robots → Sitemap
      ↓
AI / Agents
      ↓
Issues
      ↓
Inspect the exact element
      ↓
Copy fix
```

---

## Why AgentLens?

Traditional SEO tools focus on search engines and browser-facing metadata.

Modern websites are also consumed by:

- search crawlers
- AI crawlers
- fetch-based agents
- coding agents
- automated tooling
- structured-data consumers

AgentLens makes those **measurable signals** visible to developers: HTML, metadata, structured data, `robots.txt`, sitemaps, and optional `llms.txt`.

It does **not** simulate every AI system, and it does not claim to know how any provider ranks a site. It applies transparent heuristics to evidence collected from the page.

---

## What makes AgentLens different?

| | AgentLens | Traditional SEO inspector |
| --- | :---: | :---: |
| Page SEO | ✓ | ✓ |
| Headings / links / images | ✓ | ✓ |
| Structured data | ✓ | ✓ |
| robots.txt | ✓ | ✓ |
| Sitemap | ✓ | ✓ |
| AI crawler rules | ✓ | Usually limited |
| llms.txt | ✓ | Usually limited |
| Agent UX heuristics | ✓ | — |
| GitHub Action | ✓ | — |
| CLI | ✓ | — |
| Inspect live DOM | ✓ | Some tools |
| Deterministic rules | ✓ | Varies |

The AI / Agents layer is the differentiator. The SEO inspector is there so the same tool is useful day to day.

---

## Features

### 🔍 SEO Inspector

Title and meta description · canonical · robots meta · Open Graph · Twitter metadata · HTTPS · viewport · language / charset

### 🧱 Page Structure

H1–H6 and heading hierarchy · links (internal / external, generic anchors) · images and missing alt · semantic landmarks

### 🏷 Structured Data

JSON-LD · Microdata / RDFa when those attributes exist · schema types · raw blocks · parse errors (malformed JSON-LD is kept, not discarded)

### 🤖 AI / Agents

`llms.txt` / `llms-full.txt` (emerging convention, not a mandatory standard) · explicit AI crawler robots rules · Agent UX heuristics · content accessibility

### 🕷 Crawlability

`robots.txt` · `sitemap.xml` · HTTP status · redirects · canonical · indexability

### 🧪 Developer Experience

Chrome Extension · GitHub Action · CLI · stable JSON · PR comments · score gates · inspect exact DOM elements

---

## Chrome Extension

### Detailed SEO inspection + AI Agent Readiness — on the current tab.

```text
Open any website
      ↓
Open AgentLens
      ↓
See your score
      ↓
SEO · Schema · Robots · Sitemap
      ↓
AI / Agents
      ↓
Find an issue
      ↓
Inspect the exact element
      ↓
Copy the suggested fix
```

The extension analyzes the **current tab** with the same analyzer and scoring engine as the CLI and GitHub Action.

- Uses rendered page data, plus same-origin `robots.txt`, `sitemap.xml`, and `llms.txt`
- Highlights a live DOM element only when the selector matches **exactly one** node
- Shows evidence; it does not fabricate findings, scores, or line numbers
- Does **not** crawl the entire website
- Requests only `activeTab` and `scripting`

Chrome Web Store listing coming soon.

Details and permissions: [apps/extension/README.md](apps/extension/README.md).

---

## Try it now

### Chrome Extension

The extension is not in the Chrome Web Store yet. Load it unpacked:

```text
1. Clone the repository
2. Install dependencies
3. Build the extension
4. Open chrome://extensions
5. Enable Developer mode
6. Load unpacked
7. Select apps/extension/dist
```

```bash
pnpm install
pnpm extension:build
```

Then open a public `http(s)` site and click the AgentLens icon.

### CLI (from this repo)

```bash
pnpm install
pnpm build
node cli/dist/cli.js https://example.com
```

---

## GitHub Action

Add AgentLens to CI and get an AI-readiness report directly in your pull request.

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

That posts a report like:

```text
🤖 AgentLens

AI Readiness: 82/100
Grade: GOOD

🕷 Crawlability        92
📄 Content Access      84
🧱 Semantic HTML       88
🏷 Structured Data      91
🧠 LLM Discoverability 72
🔗 Agent UX            79
⚙️ Technical SEO       94

⚠️ 3 recommendations
```

The number is a **heuristic developer-oriented score**. It is not an official ranking from OpenAI, Google, Anthropic, or any search engine.

| Input | Default | Description |
| --- | --- | --- |
| `url` | required | Public `http(s)` URL |
| `fail-under` | `0` | Fail the job when the score is below this value. `0` disables the gate. |
| `comment` | `true` | Create or update a PR comment (`<!-- agentlens-report -->`) |
| `annotations` | `true` | File annotations **only** when evidence maps to a repo file |
| `pages` | `0` | Extra same-origin pages (homepage + well-known files are always fetched) |
| `github-token` | `${{ github.token }}` | Used for PR comments |

Outputs: `score`, `grade`, `json`.

Every run also writes a [job summary](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary).

Full Action docs: [docs/github-action.md](docs/github-action.md). Example workflow: [examples/github-action.yml](examples/github-action.yml).

---

## CLI

Run the same analyzer locally or in scripts.

```bash
npx agentlens https://example.com
npx agentlens https://example.com --json
npx agentlens https://example.com --fail-under 80
```

From this repository after `pnpm build`:

```bash
node cli/dist/cli.js https://example.com
```

`--fail-under` exits `1` when `score < threshold`. Invalid inputs exit `2`. Details: [docs/cli.md](docs/cli.md).

---

## JSON / automation

CLI `--json` and the Action `json` output use the same result shape: `url`, `score`, `grade`, `categories`, `findings`, `recommendations`, plus inspection and scoring breakdown when present.

Build other tools on that JSON. Do not reimplement the scoring formula.

---

## Scoring

AgentLens does not use a black-box model to produce the score.

Every point comes from a named rule and a measurable finding.

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

Full math: [docs/scoring.md](docs/scoring.md).

---

## Analyzer rules

- **Crawlability** — HTTP status, HTTPS, redirects, robots.txt, sitemap.xml, canonical, indexability
- **Content access** — title, description, visible text, conservative CSR/shell detection
- **Semantic HTML** — headings, landmarks, images, forms
- **Structured data** — JSON-LD parse + common `@type` values (not full Schema.org validation)
- **LLM discoverability** — `llms.txt` / `llms-full.txt` as an **emerging convention**, AI crawler robots groups
- **Agent UX** — documented heuristic over navigation, links, landmarks, metadata, and structured data
- **Technical SEO** — viewport, Open Graph, Twitter tags, robots meta, response hygiene

`llms.txt` absence is never phrased as “your site is not AI-ready”.

---

## Built for developers, not marketing dashboards

AgentLens does not pretend to know exactly how every AI system evaluates a website. It measures observable signals and applies transparent heuristics so developers can identify potential gaps.

- Deterministic rules
- Measurable evidence
- Transparent scoring
- No required AI API key
- No fabricated evidence
- Unknown values remain unknown

---

## Security

The crawler is SSRF-hardened.

- `http:` / `https:` only
- Blocks localhost and private / link-local addresses
- Re-validates every redirect
- Caps time, size, redirects, pages, and concurrency
- Default crawl is homepage + `/robots.txt` + `/sitemap.xml` + `/llms.txt` + `/llms-full.txt`
- Does not spider the whole site

Details: [docs/security.md](docs/security.md) and [SECURITY.md](SECURITY.md).

---

## Architecture

One core. Multiple interfaces.

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

The web app (`apps/web`) uses the same core for local reports and badges. It is not a separate analyzer.

| Path | Role |
| --- | --- |
| `packages/shared` | Types, schema, category weights |
| `packages/crawler` | SSRF-safe fetch, robots, sitemap, llms.txt |
| `packages/analyzer` | Rules + registry |
| `packages/scoring` | Weighted score, grade, fail-under |
| `packages/core` | `analyzeWebsite()` |
| `action/` | GitHub Action |
| `cli/` | CLI |
| `apps/extension` | Chrome Extension |
| `apps/web` | Optional web UI |

More detail: [docs/architecture.md](docs/architecture.md).

---

## Built to be extended

Adding an analyzer rule is intentionally simple.

```text
Rule
 ↓
Fixture
 ↓
Test
 ↓
Register
 ↓
PR
```

Useful contributions: analyzer rules, fixtures, tests, documentation, extension UX, integrations.

Guide: [docs/creating-an-analyzer-rule.md](docs/creating-an-analyzer-rule.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Roadmap

### Now

- Shared analyzer and scoring engine
- GitHub Action, CLI, and Chrome Extension
- SEO inspector + AI-agent checks on the current tab
- More analyzer rules and fixtures

### Next

- Additional analyzer rules
- Optional explanations of existing findings
- Chrome Web Store listing

### Future

- VS Code extension
- Historical scores
- Lighthouse integration
- Repository-level analysis
- More integrations

Status detail: [docs/roadmap.md](docs/roadmap.md).

---

## ⭐ Like the project?

If AgentLens helps you inspect your website, consider giving the repository a star. It helps other developers discover the project.

Found a bug? [Open an issue](https://github.com/Hazemelhelbawi/agentlens/issues).

Have an analyzer rule or improvement? Open a PR.

---

## License

[MIT](LICENSE)
