# Visual assets

This folder is for **real** product visuals. Do not commit fabricated screenshots, mock GIFs, or invented metrics.

## Intended files

```text
docs/assets/
├── agentlens-demo.gif
├── extension-overview.png
├── extension-seo.png
├── extension-ai-agents.png
├── extension-issues.png
├── architecture.png
└── github-social-preview.png
```

None of these are required for the product to work. They are for the GitHub README and repository social preview.

## Recording notes

### `agentlens-demo.gif`

Record the real Chrome Extension on a public site you are allowed to capture:

1. Open the website
2. Open AgentLens
3. Show the score on Overview
4. Open SEO, Schema, Robots, Sitemap
5. Open AI / Agents
6. Open Issues
7. Click Inspect on a unique element
8. Click Copy fix

Keep it short (10–20 seconds). Prefer a site you own.

### Screenshots

Capture the real popup (420px) in both light and dark only if the UI is actually in that theme. Crop chrome-browser UI if it adds noise, but do not restyle or fake data.

### `github-social-preview.png`

GitHub recommends 1280×640. Use AgentLens branding only. No fake star counts.

## README wiring

When a file exists, add it to the root README **See it in action** section:

```md
![AgentLens extension demo](docs/assets/agentlens-demo.gif)

![Extension overview](docs/assets/extension-overview.png)

> Inspect your current page without leaving the browser.
```

Until then, leave the HTML comments in the README. Broken image tags are worse than a placeholder.
