# GitHub Action

The Action is the primary distribution surface.

```yaml
- uses: hazemelhelbawi/agentlens@v1
  with:
    url: https://example.com
    fail-under: 75
```

## Permissions

```yaml
permissions:
  contents: read
  pull-requests: write
```

`pull-requests: write` is required to create or update the report comment.

## PR comments

Comments include a hidden marker:

```html
<!-- agentlens-report -->
```

On later runs AgentLens updates that comment instead of posting a new one.

## Job summary

The Action writes Markdown to `$GITHUB_STEP_SUMMARY` via `@actions/core` `summary`: score, grade, categories, critical findings, warnings, recommendations.

## Annotations

Annotations are emitted only when a finding's evidence string is found in a repository source file. URL-only analysis does **not** invent paths.

## Fail-under

```text
❌ AgentLens failed

Score: 68
Required: 75
```

The job fails when `score < fail-under`. Equal scores succeed.
