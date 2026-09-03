# Contributing to AgentLens

Thanks for helping. AgentLens is a GitHub-first developer tool. The most useful contributions are new analyzer rules, crawler hardening, better tests, and clearer docs.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Requires Node.js 20+ and pnpm.

## Adding an analyzer rule

This is the expected path:

1. Create rule
2. Add test
3. Add fixture
4. Register rule
5. Run tests
6. Open PR

Full walkthrough: [docs/creating-an-analyzer-rule.md](docs/creating-an-analyzer-rule.md).

## Package boundaries

| Package | May depend on |
| --- | --- |
| `shared` | zod |
| `crawler` | shared |
| `analyzer` | shared, crawler |
| `scoring` | shared |
| `core` | shared, crawler, analyzer, scoring |
| `ai` | shared |
| `action` / `cli` / `web` | core (and shared) |

Do not import Next.js, React, or an AI SDK from `core`, `crawler`, `analyzer`, or `scoring`.

## Tests

Prefer fixtures over live websites. Put HTML and robots/sitemap samples in `fixtures/`.

## Pull requests

Use the PR template. Keep changes focused. Do not add secrets, tracking, or fake UI.

If you change Action TypeScript, rebuild the committed bundle:

```bash
pnpm --filter @agentlens/action build
```

`action/dist/index.cjs` is what `uses: hazemelhelbawi/agentlens@v1` runs.

## Labels

`good first issue`, `help wanted`, `analyzer`, `crawler`, `scoring`, `github-action`, `cli`, `web`, `documentation`, `security`
