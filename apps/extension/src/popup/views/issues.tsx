import type { AnalysisResult, Category, Finding, Severity } from "@agentlens/shared";
import { CATEGORIES, CATEGORY_META } from "@agentlens/shared";
import { useMemo, useState } from "react";
import { IssueCard } from "../../components/issue-card.js";
import { SEVERITY_META } from "../../lib/severity.js";

export function Issues({
  result,
  issues,
  filter,
  category,
  detailed,
  onFilter,
  onCategory,
  onDetailed,
  onInspect,
}: {
  result: AnalysisResult;
  issues: Finding[];
  filter: "all" | Severity;
  category: Category | "all";
  detailed: boolean;
  onFilter: (value: "all" | Severity) => void;
  onCategory: (value: Category | "all") => void;
  onDetailed: (value: boolean) => void;
  onInspect: (finding: Finding) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return issues;
    return issues.filter((item) =>
      [item.title, item.description, item.id, item.evidence?.selector, item.evidence?.snippet]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [issues, query]);

  return (
    <div className="stack">
      <div className="row">
        <strong>Issues</strong>
        <button type="button" className="btn btn-sm" onClick={() => onDetailed(!detailed)} aria-pressed={detailed}>
          {detailed ? "Developer details on" : "Developer details"}
        </button>
      </div>
      <div className="actions">
        {(["all", "critical", "warning", "info", "pass"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm ${filter === value ? "btn-primary" : ""}`}
            onClick={() => onFilter(value)}
          >
            {value === "all" ? "Issues" : SEVERITY_META[value].label}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="issue-search">
        Search issues
      </label>
      <input
        id="issue-search"
        className="search"
        type="search"
        placeholder="Search issues"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <select
        aria-label="Filter by category"
        value={category}
        onChange={(event) => onCategory(event.target.value as Category | "all")}
        className="btn"
        style={{ width: "100%" }}
      >
        <option value="all">All categories</option>
        {CATEGORIES.map((id) => (
          <option key={id} value={id}>
            {CATEGORY_META[id].name}
          </option>
        ))}
      </select>
      {visible.length === 0 ? (
        <div className="card">
          <strong>No findings match this filter.</strong>
          <p className="muted">Try another severity, category, or search. Passed checks are under Passed.</p>
        </div>
      ) : null}
      {visible.map((finding) => (
        <IssueCard key={finding.id} finding={finding} detailed={detailed} onInspect={onInspect} />
      ))}
      <p className="muted">{result.findings.length} checks on this page.</p>
    </div>
  );
}
