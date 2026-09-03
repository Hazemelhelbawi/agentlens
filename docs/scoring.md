# Scoring

AgentLens scores are **heuristics for developers**. They are not an official ranking from OpenAI, Google, Anthropic, or any search engine.

## Weights

| Category | Weight |
| --- | --- |
| Crawlability | 20% |
| Content Access | 15% |
| Semantic HTML | 15% |
| Structured Data | 15% |
| LLM Discoverability | 10% |
| Agent UX | 15% |
| Technical SEO | 10% |

Implementation: `packages/scoring` and `CATEGORY_META` in `packages/shared`.

## From findings to a category score

Each finding has `score` and `maxScore`.

```text
categoryScore = round(100 * sum(score) / sum(maxScore))
```

If a category has no findings, it contributes `0`.

## Overall score

```text
overall = round(sum(categoryScore * weight))
```

Clamped to 0–100.

## Grades

| Range | Grade |
| --- | --- |
| 0–39 | Poor |
| 40–59 | Needs Work |
| 60–74 | Fair |
| 75–89 | Good |
| 90–100 | Excellent |

## Fail-under

Used by the Action and CLI:

```text
score >= threshold  → success
score <  threshold  → failure
```

Default threshold is `0` (gate disabled).

## Agent UX heuristic

Agent UX is not a separate crawl. The `agent-ux` rule awards up to 20 points:

| Signal | Points |
| --- | --- |
| `<nav>` with at least one named link | 4 |
| Canonical URL | 3 |
| JSON-LD present | 3 |
| Title and meta description | 3 |
| `<main>` landmark | 3 |
| Exactly one H1 | 2 |
| Unnamed / empty links ≤ 15% | 2 |

The `links` rule also contributes to the Agent UX category.

Every overall point is therefore traceable to a finding id.
