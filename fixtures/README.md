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
| `unlabeled-buttons/` | Empty and generic buttons |
| `generic-links/` | Learn more / Click here anchors |
| `missing-canonical/` | Metadata present, no canonical |
| `seo-heavy/` | Strong SEO metadata, weak agent UX |
| `spa-shell/` | Client-rendered application shell |
| `missing-title/` | Description present, no title |
| `long-title/` | Title longer than 70 characters |
| `missing-description/` | Title present, no meta description |
| `multiple-canonical/` | Two canonical link tags |
| `no-h1/` | Outline starts at H2 |
| `multiple-h1/` | Two H1 elements |
| `bad-heading-hierarchy/` | H1 jumps to H4 |
| `empty-links/` | Empty, javascript, and image-only links |
| `missing-alt/` | Image without an alt attribute |
| `decorative-empty-alt/` | Image with alt="" |
| `sitemap-index/` | sitemapindex with child locs |
| `malformed-sitemap/` | XML that is not a urlset or sitemapindex |
| `large-dom/` | Repeated page elements for incomplete-count tests |
