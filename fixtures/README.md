# Fixtures

HTML and protocol files used by unit tests. Prefer adding a fixture over hitting a live website.

| Directory | Intent |
| --- | --- |
| `excellent/` | Strong semantics, metadata, JSON-LD, robots, sitemap, llms.txt |
| `poor/` | Thin/missing metadata, generic links, unlabeled form |
| `js-heavy/` | Application-shell HTML |
| `broken-html/` | Recoverable malformed markup |
| `blocked-crawlers/` | robots.txt groups that restrict AI crawlers |
| `malformed-jsonld/` | Invalid `application/ld+json` |
| `missing-files/` | Page without well-known companion files |
