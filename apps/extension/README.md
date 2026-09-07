# AgentLens Chrome Extension

See the current page as a technical SEO inspector and as an AI agent would.

The extension is a UI on the **shared AgentLens analyzer and scoring engine** used by the CLI, GitHub Action, and web app. It does not invent scores, selectors, line numbers, or progress.

## What it checks

### SEO / technical

From the **rendered page DOM** (plus same-origin well-known files):

- URL, HTTPS, title, meta description, canonical
- robots meta directives that actually exist
- `html lang`, charset, viewport
- Heading outline (H1–H6)
- Links (internal/external, rel, generic/empty/javascript/image-only)
- Images (missing alt vs decorative `alt=""`, dimension attributes, `loading`)
- Structured data: JSON-LD, plus Microdata/RDFa presence when those attributes exist
- `robots.txt` groups, Host, and other directives
- `sitemap.xml` or a sitemap index (child sitemaps are listed, not crawled)

### AI / agents

- AI Agent Readiness score from the shared scoring engine
- Agent UX, crawlability, semantic HTML, LLM discoverability
- `llms.txt` and `llms-full.txt` as an **emerging convention**, not a mandatory web standard
- Explicit AI crawler rules in `robots.txt` (Allowed / Blocked / No specific rule / Unknown)

Scores are never recalculated in the extension. New SEO inspector fields are informational unless an existing analyzer rule already scores them.

## Evidence

Every finding is built from collected page data:

- **What** was detected
- **Where** it is (selector, URL, or document) when uniquely measurable
- **Why** it matters
- **How** to fix it, when a snippet can be generated from that context

AgentLens does not fabricate evidence. If something cannot be measured reliably, the UI shows **Unknown**, **Unavailable**, or **Not detected**.

`llms.txt` absence is never phrased as “this site is not AI-ready”. Robots directives are interpreted only from the fetched robots file. The extension does **not** crawl the entire website.

## Inspect

Issues and SEO rows with a unique DOM target expose **Inspect**.

Clicking Inspect focuses the tab, scrolls to the element, and shows an overlay **only when** `querySelectorAll(selector).length === 1`. There is no fallback to the first match.

## Permissions

The extension requests only:

- `activeTab` — read the page you opened the popup on
- `scripting` — inject the collector and highlight overlay on that tab

It does **not** request `<all_urls>`, the `tabs` API, or browsing history. `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` are fetched from the page's own origin by the content script.

## Load unpacked

1. From the repository root:

```bash
pnpm install
pnpm extension:build
```

2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select `apps/extension/dist`

## Daily use

1. Open a public http(s) website
2. Click the AgentLens icon
3. Read the AI Agent Readiness score and SEO health on **Overview**
4. Use **SEO** for title, headings, links, images, schema, robots, and sitemap
5. Use **AI / Agents** for llms.txt and crawler rules
6. Open **Issues** for WHAT / WHERE / WHY / HOW
7. Click **Inspect** to highlight the live element
8. Click **Copy fix** or **Copy JSON** when a snippet exists
9. **Export JSON** / **Export Markdown** and **Full report** use the exact cached result

Use **Re-analyze** after navigation. Analysis is invalidated when the tab URL changes (including SPA URL updates). It does not continuously scan the page.

## Development

```bash
pnpm extension:dev
pnpm extension:test
pnpm extension:build
```

Reload the unpacked extension after a rebuild.
