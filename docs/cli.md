# CLI

```bash
npx agentlens https://example.com
npx agentlens https://example.com --json
npx agentlens https://example.com --fail-under 80
npx agentlens https://example.com --pages 5
```

From this repository after `pnpm build`:

```bash
node cli/dist/cli.js https://example.com
```

`--fail-under` exits with code `1` when `score < threshold`. Invalid inputs exit with code `2`.
