"use client";

import type { AnalysisResult, Category, Severity } from "@agentlens/shared";
import { CATEGORIES, CATEGORY_META, GRADE_LABELS, KNOWN_AI_CRAWLERS } from "@agentlens/shared";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Link2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnalyzeForm } from "@/components/analyze-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { downloadText, exportHtml, exportJson, exportMarkdown } from "@/lib/export";
import { FindingCard } from "@/components/report/finding-card";
import { ScoreRing } from "@/components/report/score-ring";
import { gradeLabel, SEVERITY_META } from "@/lib/severity";
import { encodePageId, gradeColor } from "@/lib/utils";

type Filter = "all" | Severity;
type SortKey = "importance" | "severity" | "impact" | "category";

export function ReportView({
  result,
  reportId,
  previous,
}: {
  result: AnalysisResult;
  reportId: string;
  previous?: AnalysisResult | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("importance");
  const [detailed, setDetailed] = useState(false);
  const [simulateId, setSimulateId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    return {
      critical: result.findings.filter((f) => f.severity === "critical").length,
      warning: result.findings.filter((f) => f.severity === "warning").length,
      info: result.findings.filter((f) => f.severity === "info").length,
      pass: result.findings.filter((f) => f.severity === "pass").length,
    };
  }, [result.findings]);

  const findings = useMemo(() => {
    const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2, pass: 3 };
    return result.findings
      .filter((finding) => (filter === "all" ? true : finding.severity === filter))
      .filter((finding) => (category === "all" ? true : finding.category === category))
      .filter((finding) => {
        if (!query.trim()) return true;
        const hay = `${finding.title} ${finding.description} ${finding.id}`.toLowerCase();
        return hay.includes(query.toLowerCase());
      })
      .slice()
      .sort((a, b) => {
        if (sort === "severity" || sort === "importance") {
          const delta = order[a.severity] - order[b.severity];
          if (delta !== 0) return delta;
          return (b.scoreImpact ?? 0) - (a.scoreImpact ?? 0);
        }
        if (sort === "impact") return (b.scoreImpact ?? 0) - (a.scoreImpact ?? 0);
        return a.category.localeCompare(b.category);
      });
  }, [result.findings, filter, category, query, sort]);

  const simulated = result.findings.find((item) => item.id === simulateId);
  const projected = simulateId ? result.score + (simulated?.scoreImpact ?? 0) : result.score;
  const host = safeHost(result.url);
  const sharePath = `/report/${reportId}`;
  const badgeMarkdown = `[![AgentLens](${typeof window !== "undefined" ? window.location.origin : ""}/api/badge?url=${encodeURIComponent(result.url)})](${sharePath})`;

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold">
              AgentLens
            </Link>
            <p className="hidden font-mono text-sm sm:block" style={{ color: gradeColor(result.score) }}>
              {result.score}/100 · {GRADE_LABELS[result.grade].toUpperCase()}
            </p>
            <p className="hidden text-xs text-muted md:block">
              {counts.critical} critical · {counts.warning} warnings · {counts.pass} passed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyLink}>
              <Link2 className="mr-1 h-3.5 w-3.5" />
              {copied ? "Copied" : "Share"}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <section className="grid gap-8 md:grid-cols-[200px_1fr] md:items-center">
          <ScoreRing score={result.score} />
          <div>
            <p className="font-mono text-sm text-muted">{host}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">AI Readiness</h1>
            <p className="mt-2 text-sm text-muted">
              Analyzed {new Date(result.timestamp).toLocaleString()}
            </p>
            <p className="mt-4 max-w-xl text-muted">{result.insights?.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-2 py-1 ring-1 ${SEVERITY_META.critical.chip}`}>
                {counts.critical} critical
              </span>
              <span className={`rounded-full px-2 py-1 ring-1 ${SEVERITY_META.warning.chip}`}>
                {counts.warning} warnings
              </span>
              <span className={`rounded-full px-2 py-1 ring-1 ${SEVERITY_META.pass.chip}`}>
                {counts.pass} passed
              </span>
            </div>
          </div>
        </section>

        {previous ? <CompareBanner previous={previous} current={result} /> : null}

        <section className="rounded-xl border border-line bg-raised p-5 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Executive summary</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted">Strongest</p>
              <ul className="mt-2 space-y-1 text-sm">
                {(result.insights?.strongest ?? []).map((name) => (
                  <li key={name}>✓ {name}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted">Weakest</p>
              <ul className="mt-2 space-y-1 text-sm">
                {(result.insights?.weakest ?? []).map((name) => (
                  <li key={name}>⚠ {name}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted">Fix these first</p>
              <ol className="mt-2 space-y-2 text-sm">
                {(result.insights?.topActions ?? []).map((action, index) => (
                  <li key={action.id}>
                    <button type="button" className="text-left hover:underline" onClick={() => setSimulateId(action.id)}>
                      {index + 1}. {action.title}
                    </button>
                    {action.scoreImpact > 0 ? (
                      <span className="ml-2 text-xs text-muted">Projected +{action.scoreImpact}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Categories</h2>
            <button type="button" className="text-sm text-accent hover:underline" onClick={() => document.getElementById("why-score")?.scrollIntoView({ behavior: "smooth" })}>
              Why {result.score}?
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.categories.map((item) => {
              const checks = result.findings.filter((f) => f.category === item.id);
              return (
                <a key={item.id} href={`#category-${item.id}`} className="rounded-xl border border-line bg-raised p-4 shadow-card hover:border-accent">
                  <p className="text-sm text-muted">{item.name}</p>
                  <p className="mt-1 font-mono text-2xl">{item.score}</p>
                  <p className="text-xs text-muted">{gradeLabel(item.score)}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${item.score}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {checks.length} checks · {checks.filter((f) => f.severity === "pass").length} passed ·{" "}
                    {checks.filter((f) => f.severity === "warning" || f.severity === "critical").length} issues
                  </p>
                </a>
              );
            })}
          </div>
        </section>

        <section id="why-score" className="rounded-xl border border-line bg-raised p-5 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Score breakdown</h2>
          <p className="mt-2 text-sm text-muted">Every point is the weighted category score from actual findings.</p>
          <div className="mt-4 space-y-3">
            {(result.breakdown ?? []).map((row) => (
              <details key={row.id} className="rounded-lg border border-line px-3 py-2">
                <summary className="cursor-pointer text-sm">
                  {row.name} · {Math.round(row.weight * 100)}% weight · {row.points} points · {row.score}/100
                </summary>
                <ul className="mt-3 space-y-1 font-mono text-xs text-muted">
                  {row.checks.map((check) => (
                    <li key={check.id}>
                      {check.title.padEnd(22)} {check.score}/{check.maxScore} · {check.severity}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <p className="mt-4 font-mono text-sm">{result.score} / 100</p>
        </section>

        {simulateId ? (
          <Card>
            <p className="text-sm font-medium">What if I fix this?</p>
            <p className="mt-2 text-sm text-muted">
              {result.findings.find((f) => f.id === simulateId)?.title}
            </p>
            <p className="mt-3 font-mono text-2xl">
              {result.score} → {projected}
            </p>
            <p className="text-xs text-muted">Projected score using the same scoring engine, treating that check as passed.</p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setSimulateId(null)}>
              Clear
            </Button>
          </Card>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Issues requiring attention</h2>
              <p className="mt-1 text-sm text-muted">Filter and inspect the exact evidence behind each check.</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDetailed(false)}
                className={!detailed ? "font-medium text-ink" : "text-muted"}
              >
                Simple
              </button>
              <span className="text-muted">/</span>
              <button
                type="button"
                onClick={() => setDetailed(true)}
                className={detailed ? "font-medium text-ink" : "text-muted"}
              >
                Detailed
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "critical", "warning", "info", "pass"] as const).map((value) => (
              <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>
                {value === "all" ? "All" : SEVERITY_META[value].label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")}>
              All categories
            </Button>
            {CATEGORIES.map((id) => (
              <Button key={id} size="sm" variant={category === id ? "default" : "outline"} onClick={() => setCategory(id)}>
                {CATEGORY_META[id].name}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search findings..."
                aria-label="Search findings"
                className="pl-9"
              />
            </div>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-11 rounded-md border border-line bg-raised px-3 text-sm"
              aria-label="Sort findings"
            >
              <option value="importance">Most important first</option>
              <option value="severity">Severity</option>
              <option value="impact">Score impact</option>
              <option value="category">Category</option>
            </select>
          </div>

          <div className="space-y-3">
            {findings.length === 0 ? (
              <p className="rounded-xl border border-line bg-raised p-6 text-sm text-muted">No findings match this filter.</p>
            ) : (
              findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} detailed={detailed} />
              ))
            )}
          </div>
        </section>

        {CATEGORIES.map((id) => (
          <CategoryBlock key={id} id={id} result={result} detailed={detailed} />
        ))}

        <InspectionSections result={result} reportId={reportId} />

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold">Export report</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadText(`agentlens.json`, exportJson(result), "application/json")}>
                <Download className="mr-1 h-3.5 w-3.5" /> JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadText(`agentlens.md`, exportMarkdown(result), "text/markdown")}>
                Markdown
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadText(`agentlens.html`, exportHtml(result), "text/html")}>
                HTML
              </Button>
            </div>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold">Badge</h2>
            <p className="mt-2 font-mono text-xs text-muted">AgentLens {result.score}/100</p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-line bg-canvas p-3 font-mono text-xs">{badgeMarkdown}</pre>
          </Card>
        </section>

        <section className="rounded-xl border border-line bg-raised p-5">
          <h2 className="text-sm font-semibold">Re-analyze</h2>
          <p className="mt-1 text-sm text-muted">Run a new audit of the same URL and compare the previous score from this browser session.</p>
          <div className="mt-4">
            <AnalyzeForm compact />
          </div>
        </section>

        <aside className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
          <p className="font-medium text-ink">About this score</p>
          <p className="mt-2">
            AgentLens uses deterministic technical checks and heuristic signals to estimate machine and
            AI-agent readiness. It is not an official score from Google, OpenAI, Anthropic, or any other
            AI provider. AI crawler behavior can change independently of these signals.
          </p>
        </aside>
      </main>
    </div>
  );
}

function CategoryBlock({
  id,
  result,
  detailed,
}: {
  id: Category;
  result: AnalysisResult;
  detailed: boolean;
}) {
  const category = result.categories.find((item) => item.id === id);
  const checks = result.findings.filter((f) => f.category === id);
  if (!category) return null;
  return (
    <section id={`category-${id}`} className="scroll-mt-24">
      <h2 className="text-lg font-semibold">
        {CATEGORY_META[id].name}{" "}
        <span className="font-mono text-base text-muted">{category.score}/100</span>
      </h2>
      <ul className="mt-3 space-y-1 text-sm">
        {checks.map((finding) => (
          <li key={finding.id} className="flex gap-2">
            <span className={SEVERITY_META[finding.severity].className}>
              {finding.severity === "pass" ? "✓" : finding.severity === "critical" ? "✕" : "⚠"}
            </span>
            {finding.title}
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-3">
        {checks
          .filter((f) => f.severity !== "pass")
          .map((finding) => (
            <FindingCard key={finding.id} finding={finding} detailed={detailed} />
          ))}
      </div>
    </section>
  );
}

function InspectionSections({ result, reportId }: { result: AnalysisResult; reportId: string }) {
  const inspection = result.inspection;
  const robots = result.crawler.robotsTxt;
  const sitemap = result.crawler.sitemap;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">AI crawler access</h2>
        <p className="mt-1 text-sm text-muted">
          Unspecified means no explicit robots.txt group was found. That is not a guarantee of access.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-raised text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Crawler</th>
                <th className="px-3 py-2">Allowed</th>
                <th className="px-3 py-2">Blocked</th>
                <th className="px-3 py-2">Unknown</th>
              </tr>
            </thead>
            <tbody>
              {KNOWN_AI_CRAWLERS.map((name) => {
                const row = robots.crawlers.find((item) => item.name === name);
                const status = row?.status ?? "unspecified";
                return (
                  <tr key={name} className="border-t border-line">
                    <td className="px-3 py-2 font-mono text-xs">{name}</td>
                    <td className="px-3 py-2">{status === "allowed" ? "✓" : ""}</td>
                    <td className="px-3 py-2">{status === "restricted" ? "✓" : ""}</td>
                    <td className="px-3 py-2">{status === "unspecified" ? "?" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {robots.crawlers
          .filter((crawler) => crawler.snippet)
          .map((crawler) => (
            <pre key={crawler.name} className="mt-3 overflow-x-auto rounded-md border border-line bg-raised p-3 font-mono text-xs">
              {crawler.line ? `robots.txt line ${crawler.line}\n` : ""}
              {crawler.snippet}
            </pre>
          ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold">robots.txt</h2>
        {inspection?.robotsRaw ? (
          <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-line bg-raised p-4 font-mono text-xs">
            {inspection.robotsRaw}
          </pre>
        ) : (
          <p className="mt-3 rounded-xl border border-line bg-raised p-5 text-sm text-muted">
            No robots.txt detected. AgentLens could not fetch a successful /robots.txt response.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Sitemap</h2>
        {sitemap.fetched ? (
          <div className="mt-3 rounded-xl border border-line bg-raised p-5 text-sm">
            <p>
              {sitemap.validXml ? "✓ Valid XML" : "⚠ XML could not be confirmed as urlset/sitemapindex"} · {sitemap.urlCount} URLs ·{" "}
              {sitemap.sameOriginCount} same-origin · lastmod on {sitemap.lastmodCount}
            </p>
            {inspection?.sitemapUrls.length ? (
              <ul className="mt-4 max-h-64 space-y-1 overflow-auto font-mono text-xs">
                {inspection.sitemapUrls.map((entry) => (
                  <li key={entry.loc}>
                    {entry.sameOrigin ? "" : "⚠ "}
                    {entry.loc}
                    {entry.lastmod ? ` · ${entry.lastmod}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-line bg-raised p-5 text-sm text-muted">
            No sitemap found. AgentLens could not find a sitemap.xml or a sitemap declaration in robots.txt.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Heading outline</h2>
        {inspection?.headings.length ? (
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {inspection.headings.map((heading, index) => (
              <li key={`${heading.level}-${index}`} style={{ paddingLeft: (heading.level - 1) * 16 }}>
                H{heading.level} {heading.text || "(empty)"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No headings were found in the initial HTML.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Semantic HTML</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(inspection?.landmarks ?? {}).map(([tag, count]) => (
            <li key={tag} className="rounded-lg border border-line bg-raised px-3 py-2 font-mono text-sm">
              &lt;{tag}&gt; {count > 0 ? `✓ ${count}` : "— not found"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Links</h2>
        <p className="mt-2 text-sm text-muted">
          Total {inspection?.links.total ?? 0} · descriptive {inspection?.links.descriptive ?? 0} · generic{" "}
          {inspection?.links.generic ?? 0} · empty {inspection?.links.empty ?? 0}
        </p>
        {inspection?.links.issues.length ? (
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {inspection.links.issues.map((issue, index) => (
              <li key={`${issue.href}-${index}`}>
                {issue.kind} · {issue.text || "(unnamed)"} · {issue.href}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No generic or empty links were sampled from the homepage.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Images</h2>
        <p className="mt-2 text-sm text-muted">
          Total {inspection?.images.total ?? 0} · alt present {inspection?.images.withAlt ?? 0} · missing{" "}
          {inspection?.images.missingAlt ?? 0} · empty/decorative {inspection?.images.decorative ?? 0}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Structured data</h2>
        {inspection?.jsonLd.length ? (
          <div className="mt-3 space-y-3">
            {inspection.jsonLd.map((block) => (
              <details key={block.index} className="rounded-xl border border-line bg-raised p-4">
                <summary className="cursor-pointer text-sm">
                  Block #{block.index + 1} · {block.valid ? "Valid JSON" : "Malformed JSON"} · {block.types.join(", ") || "untyped"}
                </summary>
                {block.missingFields.length ? (
                  <p className="mt-2 text-sm text-amber-600">Missing: {block.missingFields.join(", ")}</p>
                ) : null}
                <pre className="mt-3 overflow-x-auto font-mono text-xs">{block.raw}</pre>
              </details>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No JSON-LD blocks were detected on the homepage.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">LLM discoverability</h2>
        <p className="mt-2 text-sm text-muted">
          llms.txt is an emerging convention, not a mandatory web standard.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>llms.txt {result.crawler.llmsTxt.fetched ? "✓ found" : "⚠ not found"}</li>
          <li>llms-full.txt {result.crawler.llmsFullTxt.fetched ? "✓ found" : "ℹ not found"}</li>
        </ul>
        {inspection?.llmsRaw ? (
          <pre className="mt-3 overflow-auto rounded-xl border border-line bg-raised p-4 font-mono text-xs">{inspection.llmsRaw}</pre>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Affected pages</h2>
        <p className="mt-1 text-sm text-muted">{inspection?.pages.length ?? 1} page(s) analyzed in this run.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-raised text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Title</th>
              </tr>
            </thead>
            <tbody>
              {(inspection?.pages ?? []).map((page) => (
                <tr key={page.url} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link className="hover:underline" href={`/report/${reportId}/page/${encodePageId(page.url)}`}>
                      {page.path}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{page.statusCode}</td>
                  <td className="px-3 py-2">{page.title ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {inspection?.sitemapUrls.length ? (
        <section>
          <h2 className="text-lg font-semibold">Site structure</h2>
          <pre className="mt-3 overflow-auto rounded-xl border border-line bg-raised p-4 font-mono text-xs">
            {sitemapTree(inspection.sitemapUrls.map((item) => item.loc))}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

function CompareBanner({ previous, current }: { previous: AnalysisResult; current: AnalysisResult }) {
  const delta = current.score - previous.score;
  return (
    <Card>
      <p className="text-sm font-medium">Score changed</p>
      <p className="mt-2 flex items-center gap-2 font-mono text-2xl">
        {previous.score} → {current.score}
        {delta >= 0 ? <ArrowUpRight className="h-5 w-5 text-emerald-500" /> : <ArrowDownRight className="h-5 w-5 text-red-500" />}
        <span className="text-base">{delta >= 0 ? `+${delta}` : delta}</span>
      </p>
    </Card>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function sitemapTree(urls: string[]): string {
  const paths = urls
    .map((url) => {
      try {
        return new URL(url).pathname || "/";
      } catch {
        return url;
      }
    })
    .slice(0, 40);
  return paths.map((path) => (path === "/" ? "/" : `├── ${path}`)).join("\n");
}

