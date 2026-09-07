import type {
  AnalysisResult,
  HeadingNode,
  ImageRecord,
  LinkRecord,
  SeoCheckStatus,
} from "@agentlens/shared";
import { KNOWN_AI_CRAWLERS } from "@agentlens/shared";
import { useMemo, useState, type ReactNode } from "react";
import { copyText } from "../../lib/copy.js";
import { accessToRule, crawlerLabel, fileLabel, ruleFromGroups } from "../../lib/crawler-status.js";
import { inspectUnique } from "../inspect.js";
import { StatusMark } from "../status.js";

type SeoTab = "summary" | "headings" | "links" | "images" | "schema" | "robots" | "sitemap";
type ListFilter = "all" | "problems" | "passed";

const TABS: Array<[SeoTab, string]> = [
  ["summary", "Summary"],
  ["headings", "Headings"],
  ["links", "Links"],
  ["images", "Images"],
  ["schema", "Schema"],
  ["robots", "Robots"],
  ["sitemap", "Sitemap"],
];

function matches(query: string, parts: Array<string | undefined>): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.filter(Boolean).join(" ").toLowerCase().includes(needle);
}

function pathLabel(href: string): string {
  try {
    const last = new URL(href, "https://example.com").pathname.split("/").filter(Boolean).pop();
    return last ? last.replace(/[-_]/g, " ") : "";
  } catch {
    return "";
  }
}

function InspectButton({
  title,
  description,
  detected,
  fix,
  selector,
  unique,
  tagName,
}: {
  title: string;
  description: string;
  detected?: string;
  fix?: string;
  selector?: string;
  unique?: boolean;
  tagName?: string;
}) {
  if (!selector || unique !== true) return null;
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={() =>
        void inspectUnique({ title, description, detected, fix, selector, unique, tagName })
      }
    >
      Inspect
    </button>
  );
}

function CopyButton({ text, label = "Copy fix" }: { text?: string; label?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  if (!text) return null;
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={() => {
        void copyText(text).then((ok) => {
          setState(ok ? "ok" : "fail");
          window.setTimeout(() => setState("idle"), 1200);
        });
      }}
    >
      {state === "ok" ? "Copied" : state === "fail" ? "Copy failed" : label}
    </button>
  );
}

function SourceView({
  tag,
  snippet,
  detailed,
}: {
  tag?: string;
  snippet?: string;
  detailed?: boolean;
}) {
  if (!tag && !snippet) return null;
  return (
    <div className="source-view">
      {tag ? <p className="muted">Tag: {tag}</p> : null}
      {snippet ? <pre className="source">{snippet}</pre> : null}
      {detailed && !snippet ? <p className="muted">Raw evidence unavailable</p> : null}
    </div>
  );
}

function Field({
  label,
  status,
  children,
}: {
  label: string;
  status?: SeoCheckStatus;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <div className="row">
        <strong>{label}</strong>
        {status ? <StatusMark status={status} /> : null}
      </div>
      {children}
    </section>
  );
}

export function Seo({ result, detailed }: { result: AnalysisResult; detailed: boolean }) {
  const [tab, setTab] = useState<SeoTab>("summary");
  return (
    <div className="stack">
      <nav className="subnav" role="tablist" aria-label="SEO sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="subtab"
            id={`seo-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`seo-panel-${id}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div id={`seo-panel-${tab}`} role="tabpanel" aria-labelledby={`seo-tab-${tab}`}>
        {tab === "summary" ? <SeoSummary result={result} detailed={detailed} /> : null}
        {tab === "headings" ? <Headings result={result} detailed={detailed} /> : null}
        {tab === "links" ? <Links result={result} detailed={detailed} /> : null}
        {tab === "images" ? <Images result={result} detailed={detailed} /> : null}
        {tab === "schema" ? <Schema result={result} detailed={detailed} /> : null}
        {tab === "robots" ? <Robots result={result} detailed={detailed} /> : null}
        {tab === "sitemap" ? <Sitemap result={result} /> : null}
      </div>
    </div>
  );
}

function SeoSummary({ result, detailed }: { result: AnalysisResult; detailed: boolean }) {
  const seo = result.inspection?.seo;
  const finding = (id: string) => result.findings.find((item) => item.id === id);
  if (!seo) return <p className="muted">SEO metadata is unavailable for this analysis.</p>;
  return (
    <div className="stack">
      <Field label="URL">
        <dl className="kv">
          <div><dt>Current URL</dt><dd className="mono">{seo.url.href}</dd></div>
          <div><dt>Protocol</dt><dd>{seo.url.protocol}</dd></div>
          <div><dt>HTTPS</dt><dd>{seo.url.https ? "Yes" : "No"}</dd></div>
          <div><dt>Hostname</dt><dd>{seo.url.hostname}</dd></div>
          <div><dt>Path</dt><dd>{seo.url.pathname}</dd></div>
          {seo.url.search ? (
            <div><dt>Query</dt><dd className="mono">{seo.url.search}</dd></div>
          ) : null}
        </dl>
      </Field>
      <Field label="Title" status={seo.title.status}>
        <p>{seo.title.value || "Not detected"}</p>
        {seo.title.length !== undefined ? <p className="muted">{seo.title.length} characters</p> : null}
        {seo.title.notes.map((note) => (
          <p key={note} className="muted">{note}</p>
        ))}
        <SourceView tag="title" snippet={finding("title")?.evidence?.snippet} detailed={detailed} />
        <InspectButton
          title="Title"
          description={seo.title.value ?? "Missing title"}
          selector={finding("title")?.inspectTargets?.find((item) => item.unique)?.selector}
          unique={finding("title")?.inspectTargets?.some((item) => item.unique)}
          tagName="title"
        />
      </Field>
      <Field label="Meta description" status={seo.description.status}>
        <p>{seo.description.value || "Not detected"}</p>
        {seo.description.length !== undefined ? <p className="muted">{seo.description.length} characters</p> : null}
        {seo.description.notes.map((note) => (
          <p key={note} className="muted">{note}</p>
        ))}
        <InspectButton
          title="Meta description"
          description={seo.description.value ?? "Missing description"}
          selector={finding("description")?.inspectTargets?.find((item) => item.unique)?.selector}
          unique={finding("description")?.inspectTargets?.some((item) => item.unique)}
          tagName="meta"
        />
      </Field>
      <Field label="Canonical" status={seo.canonical.status}>
        <p className="mono">{seo.canonical.href || "Not detected"}</p>
        <p className="muted">Count: {seo.canonical.count}</p>
        {seo.canonical.absolute !== undefined ? (
          <p className="muted">{seo.canonical.absolute ? "Absolute URL" : "Relative URL"}</p>
        ) : null}
        {seo.canonical.matchesCurrent !== undefined ? (
          <p className="muted">{seo.canonical.matchesCurrent ? "Matches current path" : "Does not match current path"}</p>
        ) : null}
        {seo.canonical.notes.map((note) => (
          <p key={note} className="muted">{note}</p>
        ))}
        <CopyButton
          text={
            seo.canonical.href
              ? undefined
              : `<link rel="canonical" href="${result.url}">`
          }
        />
        <InspectButton
          title="Canonical"
          description={seo.canonical.href ?? "Missing canonical"}
          selector={finding("canonical")?.inspectTargets?.find((item) => item.unique)?.selector}
          unique={finding("canonical")?.inspectTargets?.some((item) => item.unique)}
          tagName="link"
        />
      </Field>
      <Field label="Robots meta">
        {seo.robotsMeta.directives.length ? (
          <p>{seo.robotsMeta.directives.join(", ")}</p>
        ) : (
          <p className="muted">No robots meta directives detected</p>
        )}
      </Field>
      <Field label="Language" status={seo.language.status}>
        <p>{seo.language.value || "Not detected"}</p>
      </Field>
      <Field label="Charset" status={seo.charset.status}>
        <p>{seo.charset.value || "Not detected"}</p>
      </Field>
      <Field label="Viewport" status={seo.viewport.status}>
        <p className="mono">{seo.viewport.value || "Not detected"}</p>
      </Field>
    </div>
  );
}

function Headings({ result, detailed }: { result: AnalysisResult; detailed: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const counts = result.inspection?.headingCounts ?? {};
  const warnings = result.inspection?.headingWarnings ?? [];
  const headings = (result.inspection?.headings ?? []).filter((item) => {
    if (filter === "problems" && !item.empty) return false;
    if (filter === "passed" && item.empty) return false;
    return matches(query, [item.tag, item.text, item.selector]);
  });
  return (
    <div className="stack">
      <div className="count-row">
        {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((tag) => (
          <span key={tag} className="chip">
            {tag.toUpperCase()} · {counts[tag] ?? 0}
          </span>
        ))}
      </div>
      {warnings.map((note) => (
        <p key={note} className="muted"><StatusMark status="warning" label={note} /></p>
      ))}
      <ListTools query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} label="headings" />
      {headings.map((item, index) => (
        <HeadingRow key={`${item.tag}-${index}-${item.text}`} item={item} detailed={detailed} />
      ))}
    </div>
  );
}

function HeadingRow({ item, detailed }: { item: HeadingNode; detailed: boolean }) {
  return (
    <div className="tree-item" style={{ paddingLeft: `${(item.level - 1) * 12}px` }}>
      <div className="row">
        <strong>{(item.tag ?? `h${item.level}`).toUpperCase()}</strong>
        {item.empty ? <StatusMark status="warning" label="Empty heading" /> : null}
      </div>
      <p>{item.text || "(empty)"}</p>
      {detailed && item.selector ? <p className="mono muted">{item.selector}</p> : null}
      <InspectButton
        title={`${(item.tag ?? "h").toUpperCase()} heading`}
        description={item.text || "Empty heading"}
        detected={item.text}
        selector={item.selector}
        unique={item.unique}
        tagName={item.tag}
      />
    </div>
  );
}

function Links({ result, detailed }: { result: AnalysisResult; detailed: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const index = result.inspection?.linkIndex;
  const items = useMemo(() => {
    return (index?.items ?? []).filter((item) => {
      const problem = item.kind !== "ok";
      if (filter === "problems" && !problem) return false;
      if (filter === "passed" && problem) return false;
      return matches(query, [item.text, item.href, item.rel, item.selector]);
    });
  }, [index, filter, query]);
  if (!index) return <p className="muted">Link inspection is unavailable.</p>;
  return (
    <div className="stack">
      <dl className="stat-list">
        <div><dt>Total</dt><dd>{index.total}</dd></div>
        <div><dt>Internal</dt><dd>{index.internal}</dd></div>
        <div><dt>External</dt><dd>{index.external}</dd></div>
        <div><dt>Nofollow</dt><dd>{index.nofollow}</dd></div>
        <div><dt>Sponsored</dt><dd>{index.sponsored}</dd></div>
        <div><dt>UGC</dt><dd>{index.ugc}</dd></div>
        <div><dt>Generic</dt><dd>{index.generic}</dd></div>
        <div><dt>Empty</dt><dd>{index.empty}</dd></div>
      </dl>
      <ListTools query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} label="links" />
      {items.map((item, i) => (
        <LinkRow key={`${item.href}-${item.text}-${i}`} item={item} detailed={detailed} />
      ))}
    </div>
  );
}

function LinkRow({ item, detailed }: { item: LinkRecord; detailed: boolean }) {
  const suggested = item.kind === "generic" || item.kind === "empty"
    ? `<a href="${item.href}">${pathLabel(item.href) || "View details"}</a>`
    : undefined;
  return (
    <article className="card">
      <div className="row">
        <strong>{item.text || "(no accessible name)"}</strong>
        {item.kind !== "ok" ? <StatusMark status="warning" label={item.kind.replace("-", " ")} /> : <StatusMark status="pass" />}
      </div>
      <p className="mono">{item.href}</p>
      <p className="muted">
        {item.internal === true ? "Internal" : item.internal === false ? "External" : "Origin unknown"}
        {item.rel ? ` · rel ${item.rel}` : ""}
      </p>
      {detailed && item.selector ? <p className="mono muted">{item.selector}</p> : null}
      <div className="actions">
        <InspectButton
          title="Link"
          description={item.text || item.href}
          detected={`<a href="${item.href}">${item.text}</a>`}
          fix={suggested}
          selector={item.selector}
          unique={item.unique}
          tagName="a"
        />
        <CopyButton text={suggested} />
      </div>
    </article>
  );
}

function Images({ result, detailed }: { result: AnalysisResult; detailed: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const index = result.inspection?.imageIndex;
  const items = useMemo(() => {
    return (index?.items ?? []).filter((item) => {
      const problem = item.altKind === "missing";
      if (filter === "problems" && !problem) return false;
      if (filter === "passed" && problem) return false;
      return matches(query, [item.src, item.alt, item.selector]);
    });
  }, [index, filter, query]);
  if (!index) return <p className="muted">Image inspection is unavailable.</p>;
  return (
    <div className="stack">
      <dl className="stat-list">
        <div><dt>Total</dt><dd>{index.total}</dd></div>
        <div><dt>With alt</dt><dd>{index.withAlt}</dd></div>
        <div><dt>Missing alt</dt><dd>{index.missingAlt}</dd></div>
        <div><dt>Empty alt</dt><dd>{index.emptyAlt}</dd></div>
        <div><dt>Width/height attrs</dt><dd>{index.withDimensions}</dd></div>
        <div><dt>No dimension attrs</dt><dd>{index.withoutDimensions}</dd></div>
        <div><dt>loading=lazy</dt><dd>{index.lazy}</dd></div>
        <div><dt>Image links</dt><dd>{index.imageLinks}</dd></div>
      </dl>
      <p className="muted">Empty alt is treated as decorative, not as missing alt. Dimension counts use HTML attributes only.</p>
      <ListTools query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} label="images" />
      {items.map((item, i) => (
        <ImageRow key={`${item.src}-${i}`} item={item} detailed={detailed} />
      ))}
    </div>
  );
}

function ImageRow({ item, detailed }: { item: ImageRecord; detailed: boolean }) {
  const status = item.altKind === "missing" ? "fail" : item.altKind === "empty" ? "info" : "pass";
  const label = item.altKind === "missing" ? "Missing alt" : item.altKind === "empty" ? "Decorative empty alt" : "Alt present";
  const fix = item.altKind === "missing" && item.src
    ? `<img src="${item.src}" alt="Describe this image">`
    : undefined;
  return (
    <article className="card">
      <StatusMark status={status} label={label} />
      <p className="mono">{item.src || "src not detected"}</p>
      {item.altKind !== "missing" ? <p className="muted">alt: {JSON.stringify(item.alt ?? "")}</p> : null}
      <p className="muted">
        {item.width && item.height ? `${item.width}×${item.height}` : "Width/height attributes not set"}
        {item.loading ? ` · loading=${item.loading}` : ""}
        {item.inLink ? " · image link" : ""}
      </p>
      {detailed && item.selector ? <p className="mono muted">{item.selector}</p> : null}
      <SourceView tag="img" snippet={item.src ? `<img src="${item.src}"${item.alt !== undefined ? ` alt="${item.alt}"` : ""}>` : undefined} detailed={detailed} />
      <div className="actions">
        <InspectButton
          title="Image"
          description={label}
          detected={item.src}
          fix={fix}
          selector={item.selector}
          unique={item.unique}
          tagName="img"
        />
        <CopyButton text={fix} />
      </div>
    </article>
  );
}

function Schema({ result, detailed }: { result: AnalysisResult; detailed: boolean }) {
  const [query, setQuery] = useState("");
  const schema = result.inspection?.schema;
  const blocks = (result.inspection?.jsonLd ?? []).filter((block) =>
    matches(query, [block.raw, block.types.join(" "), String(block.index)]),
  );
  return (
    <div className="stack">
      <div className="card">
        <strong>Structured data</strong>
        <p className="muted">Detected formats only. AgentLens does not perform full Schema.org validation.</p>
        <dl className="stat-list">
          <div><dt>JSON-LD</dt><dd>{schema?.jsonLdCount ?? blocks.length}</dd></div>
          <div><dt>Microdata</dt><dd>{schema?.microdataCount ?? 0}</dd></div>
          <div><dt>RDFa</dt><dd>{schema?.rdfaCount ?? 0}</dd></div>
        </dl>
        {schema?.types.length ? <p>{schema.types.join(", ")}</p> : <p className="muted">No schema types detected</p>}
      </div>
      <ListTools query={query} onQuery={setQuery} filter="all" onFilter={() => undefined} label="schema blocks" hideFilter />
      {blocks.length === 0 ? (
        <p className="muted">No JSON-LD blocks detected.</p>
      ) : (
        blocks.map((block) => {
          const pretty = prettyJson(block.raw);
          return (
            <article key={block.index} className="card">
              <div className="row">
                <strong>{block.types.join(", ") || "JSON-LD"}</strong>
                <StatusMark status={block.valid ? "pass" : "warning"} label={block.valid ? "Valid JSON" : "Malformed JSON-LD"} />
              </div>
              {block.missingFields.length ? <p className="muted">Noted missing: {block.missingFields.join(", ")}</p> : null}
              {detailed && block.selector ? <p className="mono muted">{block.selector}</p> : null}
              <pre className="source">{pretty}</pre>
              <div className="actions">
                <CopyButton text={pretty} label="Copy JSON" />
                <InspectButton
                  title="JSON-LD"
                  description={block.types.join(", ") || "JSON-LD"}
                  detected={block.raw}
                  selector={block.selector}
                  unique={block.unique}
                  tagName="script"
                />
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

function Robots({ result, detailed }: { result: AnalysisResult; detailed: boolean }) {
  const detail = result.inspection?.robotsDetail;
  const robots = result.crawler.robotsTxt;
  const status = detail?.status ?? (robots.fetched ? "found" : "unknown");
  const groups = robots.groups;
  const crawlers = ["Googlebot", ...KNOWN_AI_CRAWLERS];
  return (
    <div className="stack">
      <div className="card">
        <div className="row">
          <strong>robots.txt</strong>
          <StatusMark status={status} label={fileLabel(status).text.toUpperCase()} />
        </div>
        <p className="mono">{detail?.url || "URL unavailable"}</p>
        {status === "error" ? <p className="muted">robots.txt unavailable</p> : null}
        {status === "not-found" ? <p className="muted">robots.txt was not found at the default path.</p> : null}
      </div>
      {robots.groups.length ? (
        <div className="card">
          <strong>Directives</strong>
          {robots.groups.map((group, index) => (
            <pre key={index} className="source">
              {`User-agent: ${group.userAgents.join(", ")}\n${group.allow.map((rule) => `Allow: ${rule}`).join("\n")}${
                group.allow.length && group.disallow.length ? "\n" : ""
              }${group.disallow.map((rule) => `Disallow: ${rule}`).join("\n")}`}
            </pre>
          ))}
          {robots.sitemaps.map((item) => (
            <p key={item} className="mono muted">Sitemap: {item}</p>
          ))}
          {detail?.host.map((item) => (
            <p key={item} className="mono muted">Host: {item}</p>
          ))}
          {detail?.otherDirectives.map((item) => (
            <p key={`${item.field}:${item.value}`} className="mono muted">{item.field}: {item.value}</p>
          ))}
        </div>
      ) : null}
      <div className="card">
        <strong>Crawler matrix</strong>
        <table className="score-table">
          <thead>
            <tr><th>Crawler</th><th>Status</th></tr>
          </thead>
          <tbody>
            {crawlers.map((name) => {
              const known = robots.crawlers.find((item) => item.name === name);
              const rule = known ? accessToRule(known, status) : ruleFromGroups(groups, name, status);
              return (
                <tr key={name}>
                  <td>{name}</td>
                  <td><StatusMark status={rule} label={crawlerLabel(rule)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {detailed
          ? robots.crawlers
              .filter((item) => item.snippet)
              .map((item) => (
                <pre key={item.name} className="source">{item.snippet}</pre>
              ))
          : null}
      </div>
      {result.inspection?.robotsRaw ? <pre className="source">{result.inspection.robotsRaw}</pre> : null}
    </div>
  );
}

function Sitemap({ result }: { result: AnalysisResult }) {
  const meta = result.inspection?.sitemapMeta;
  const status = meta?.status ?? (result.crawler.sitemap.fetched ? "found" : "unknown");
  const urls = result.inspection?.sitemapUrls ?? [];
  return (
    <div className="stack">
      <div className="card">
        <div className="row">
          <strong>Sitemap</strong>
          <StatusMark status={status} label={fileLabel(status).text.toUpperCase()} />
        </div>
        <p className="mono">{meta?.url || "URL unavailable"}</p>
        {status === "error" ? <p className="muted">sitemap.xml unavailable or could not be parsed</p> : null}
        {status === "not-found" ? <p className="muted">sitemap.xml was not found at the default path.</p> : null}
        {meta?.isIndex ? (
          <p>Sitemap Index · {meta.childSitemaps.length} sitemaps</p>
        ) : (
          <p>{meta ? `${meta.urlCount} URLs` : "URL count unavailable"}</p>
        )}
        {meta?.duplicateCount ? <p className="muted">Duplicate URLs: {meta.duplicateCount}</p> : null}
        {meta?.missingLocCount ? <p className="muted">Missing loc: {meta.missingLocCount}</p> : null}
        {meta?.invalidUrlCount ? <p className="muted">Invalid URLs: {meta.invalidUrlCount}</p> : null}
        {meta?.canonicalInSitemap !== undefined ? (
          <p className="muted">
            {meta.canonicalInSitemap ? "Canonical URL is listed in this sitemap file" : "Canonical URL is not in this sitemap file"}
          </p>
        ) : null}
        <p className="muted">Child sitemaps are listed, not crawled.</p>
      </div>
      {meta?.isIndex
        ? meta.childSitemaps.map((item) => (
            <p key={item} className="mono card">{item}</p>
          ))
        : urls.map((item) => (
            <div key={item.loc} className="card">
              <p className="mono">{item.loc}</p>
              {item.lastmod ? <p className="muted">lastmod {item.lastmod}</p> : null}
            </div>
          ))}
    </div>
  );
}

function ListTools({
  query,
  onQuery,
  filter,
  onFilter,
  label,
  hideFilter,
}: {
  query: string;
  onQuery: (value: string) => void;
  filter: ListFilter;
  onFilter: (value: ListFilter) => void;
  label: string;
  hideFilter?: boolean;
}) {
  return (
    <div className="filter-bar">
      <label className="sr-only" htmlFor={`search-${label}`}>
        Search {label}
      </label>
      <input
        id={`search-${label}`}
        className="search"
        type="search"
        placeholder={`Search ${label}`}
        value={query}
        onChange={(event) => onQuery(event.target.value)}
      />
      {hideFilter ? null : (
        <div className="actions">
          {(["all", "problems", "passed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`btn btn-sm ${filter === value ? "btn-primary" : ""}`}
              onClick={() => onFilter(value)}
            >
              {value === "all" ? "All" : value === "problems" ? "Problems" : "Passed"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
