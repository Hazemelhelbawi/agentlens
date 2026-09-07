import type { AnalysisResult, Finding, SeoCheckStatus } from "@agentlens/shared";
import { GRADE_LABELS } from "@agentlens/shared";
import { ScoreRing } from "../../components/score-ring.js";
import { TIPS } from "../../lib/severity.js";
import { inspectFinding } from "../inspect.js";
import { StatusMark, Tip } from "../status.js";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function healthStatus(status?: SeoCheckStatus): SeoCheckStatus {
  return status ?? "unknown";
}

export function Overview({
  result,
  counts,
  why,
  onWhy,
}: {
  result: AnalysisResult;
  counts: Record<"critical" | "warning" | "info" | "pass", number>;
  why: boolean;
  onWhy: () => void;
}) {
  const issues = counts.critical + counts.warning;
  const seo = result.inspection?.seo;
  const headings = result.inspection?.headingCounts;
  const schemaCount = result.inspection?.schema?.jsonLdCount ?? result.inspection?.jsonLd.length ?? 0;
  const h1 = headings?.h1 ?? result.inspection?.headings.filter((item) => item.level === 1).length ?? 0;
  const h1Status: SeoCheckStatus = h1 === 1 ? "pass" : h1 === 0 ? "fail" : "warning";
  const schemaStatus: SeoCheckStatus = schemaCount > 0 ? "pass" : "fail";
  const robotsStatus: SeoCheckStatus =
    result.inspection?.robotsDetail?.status === "found"
      ? "pass"
      : result.inspection?.robotsDetail?.status === "error"
        ? "fail"
        : result.crawler.robotsTxt.fetched
          ? "pass"
          : "warning";
  const sitemapStatus: SeoCheckStatus =
    result.inspection?.sitemapMeta?.status === "found"
      ? "pass"
      : result.inspection?.sitemapMeta?.status === "error"
        ? "fail"
        : result.crawler.sitemap.fetched
          ? "pass"
          : "warning";

  const health = [
    { label: "Title", status: healthStatus(seo?.title.status) },
    { label: "Description", status: healthStatus(seo?.description.status) },
    { label: "Canonical", status: healthStatus(seo?.canonical.status) },
    { label: "H1", status: h1Status },
    { label: "Schema", status: schemaStatus },
    { label: "Robots", status: robotsStatus },
    { label: "Sitemap", status: sitemapStatus },
  ];

  const aiRows = [
    { id: "agent-ux" as const, label: "Agent UX", tip: TIPS["Agent UX"] ?? "Agent UX" },
    { id: "crawlability" as const, label: "Crawlability", tip: TIPS.Crawlability ?? "Crawlability" },
    { id: "semantic-html" as const, label: "Machine readability", tip: "Semantic HTML category from the shared scoring engine." },
    { id: "llm-discoverability" as const, label: "LLM discoverability", tip: TIPS["LLM Discoverability"] ?? "LLM Discoverability" },
  ];

  const first =
    result.insights?.topActions?.length
      ? result.insights.topActions
      : result.findings
          .filter((item) => item.severity === "critical" || item.severity === "warning")
          .slice(0, 3)
          .map((item) => ({
            id: item.id,
            title: item.title,
            severity: item.severity,
            scoreImpact: item.scoreImpact ?? 0,
            affectedPages: item.affectedPages?.length ?? 1,
          }));

  const stats = result.domStats;

  return (
    <div className="stack">
      <div className="hero">
        <ScoreRing score={result.score} grade={result.grade} />
        <div>
          <p className="kicker">
            AI Agent Readiness <Tip label="AI Agent Readiness" text={TIPS["AI Agent Readiness"] ?? "AI Agent Readiness"} />
          </p>
          <h1 className="h1">{result.score} / 100</h1>
          <p className="grade-line">{GRADE_LABELS[result.grade]}</p>
          <p className="host">{hostOf(result.url)}</p>
          <div className="counts">
            <span className="chip">{issues} issues found</span>
            <span className={`chip ${counts.critical ? "sev-critical" : ""}`}>{counts.critical} critical</span>
            <span className={`chip ${counts.warning ? "sev-warning" : ""}`}>{counts.warning} warnings</span>
            <span className={`chip ${counts.pass ? "sev-pass" : ""}`}>{counts.pass} passed</span>
          </div>
        </div>
      </div>

      <div className="card">
        <strong>SEO health</strong>
        <div className="health-grid" role="list">
          {health.map((item) => (
            <div key={item.label} className="health-item" role="listitem">
              <span>{item.label}</span>
              <StatusMark status={item.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <strong>AI agent summary</strong>
        {aiRows.map((row) => {
          const category = result.categories.find((item) => item.id === row.id);
          return (
            <div key={row.id} className="cat-row">
              <div className="row">
                <span>
                  {row.label} <Tip label={row.label} text={row.tip ?? row.label} />
                </span>
                <span>{category ? `${category.score} / 100` : "Unavailable"}</span>
              </div>
              {category ? (
                <div className="bar" aria-hidden>
                  <span style={{ width: `${category.score}%` }} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {stats ? (
        <div className="card">
          <strong>Elements</strong>
          <dl className="stat-list">
            <div><dt>Links</dt><dd>{stats.links}</dd></div>
            <div><dt>Buttons</dt><dd>{stats.buttons}</dd></div>
            <div><dt>Images</dt><dd>{stats.images}</dd></div>
            <div><dt>Headings</dt><dd>{stats.headings}</dd></div>
            <div><dt>Forms</dt><dd>{stats.forms}</dd></div>
            <div><dt>Schema</dt><dd>{stats.jsonLd}</dd></div>
          </dl>
        </div>
      ) : null}

      <div className="card">
        <strong>Fix these first</strong>
        {first.length === 0 ? (
          <p className="muted">No high-impact issues were recorded for this page.</p>
        ) : (
          <ul className="plain-list">
            {first.slice(0, 4).map((item) => {
              const finding = result.findings.find((entry) => entry.id === item.id) as Finding | undefined;
              return (
                <li key={item.id}>
                  <div className="row">
                    <span>{item.title}</span>
                    {finding && (finding.inspectTargets ?? []).some((item) => item.unique) ? (
                      <button type="button" className="btn btn-sm" onClick={() => void inspectFinding(finding)}>
                        Inspect
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="row">
          <strong>Why this score?</strong>
          <button type="button" className="btn btn-sm" onClick={onWhy} aria-expanded={why}>
            {why ? "Hide" : "Show"}
          </button>
        </div>
        {why ? (
          <>
            <p className="muted">Category points come from the shared AgentLens scoring engine. This view does not recalculate them.</p>
            <table className="score-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Score</th>
                  <th>Weight</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                {(result.breakdown ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.score} / 100</td>
                    <td>{Math.round(row.weight * 100)}%</td>
                    <td>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="total-line">Total: {result.score} / 100</p>
          </>
        ) : null}
      </div>
      <p className="muted">{result.insights?.summary}</p>
    </div>
  );
}
