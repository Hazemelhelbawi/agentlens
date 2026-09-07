import type { AnalysisResult, AnalyzeStage, Category, Finding, Severity } from "@agentlens/shared";
import { useEffect, useMemo, useState } from "react";
import { ErrorState } from "../components/error-state.js";
import { LoadingState } from "../components/loading-state.js";
import { downloadText, exportJson, exportMarkdown } from "../lib/export.js";
import type { BackgroundToPopup, ExtensionError, ExtensionState } from "../lib/messages.js";
import { applyTheme, persistTheme, readTheme, type Theme } from "../lib/theme.js";
import { inspectFinding } from "./inspect.js";
import { AiAgents } from "./views/ai-agents.js";
import { Issues } from "./views/issues.js";
import { Overview } from "./views/overview.js";
import { Seo } from "./views/seo.js";

type Tab = "overview" | "seo" | "ai" | "issues";

const TABS: Array<[Tab, string]> = [
  ["overview", "Overview"],
  ["seo", "SEO"],
  ["ai", "AI / Agents"],
  ["issues", "Issues"],
];

export function Popup({
  connect = defaultConnect,
}: {
  connect?: () => chrome.runtime.Port;
}) {
  const [state, setState] = useState<ExtensionState>("analyzing");
  const [stage, setStage] = useState<AnalyzeStage | "reading-dom">("reading-dom");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<ExtensionError | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [detailed, setDetailed] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const [why, setWhy] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const port = connect();
    port.onMessage.addListener((message: BackgroundToPopup) => {
      if (message.type === "STAGE") {
        setState("analyzing");
        setStage(message.stage);
      }
      if (message.type === "RESULT") {
        setResult(message.result);
        setError(null);
        setState("success");
      }
      if (message.type === "ERROR") {
        setError(message.error);
        setState("error");
      }
    });
    port.postMessage({ type: "ANALYZE" });
    return () => port.disconnect();
  }, [connect]);

  function reanalyze() {
    setState("analyzing");
    setStage("reading-dom");
    setError(null);
    const port = connect();
    port.onMessage.addListener((message: BackgroundToPopup) => {
      if (message.type === "STAGE") setStage(message.stage);
      if (message.type === "RESULT") {
        setResult(message.result);
        setState("success");
        port.disconnect();
      }
      if (message.type === "ERROR") {
        setError(message.error);
        setState("error");
        port.disconnect();
      }
    });
    port.postMessage({ type: "ANALYZE", force: true });
  }

  const counts = useMemo(() => {
    const findings = result?.findings ?? [];
    return {
      critical: findings.filter((item) => item.severity === "critical").length,
      warning: findings.filter((item) => item.severity === "warning").length,
      info: findings.filter((item) => item.severity === "info").length,
      pass: findings.filter((item) => item.severity === "pass").length,
    };
  }, [result]);

  const issues = useMemo(() => {
    if (!result) return [];
    return result.findings
      .filter((item) => {
        if (filter === "all") return item.severity !== "pass";
        return item.severity === filter;
      })
      .filter((item) => (category === "all" ? true : item.category === category));
  }, [result, filter, category]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">AgentLens</div>
        <div className="top-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="Toggle color theme"
            onClick={() => {
              const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
              setTheme(next);
              persistTheme(next);
            }}
          >
            {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Auto"}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-pressed={detailed}
            onClick={() => setDetailed((value) => !value)}
          >
            {detailed ? "Dev on" : "Dev"}
          </button>
          <button type="button" className="icon-btn" onClick={reanalyze}>
            Re-analyze
          </button>
        </div>
      </header>

      {state === "success" ? (
        <nav className="tabs" role="tablist" aria-label="Report sections">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="tab"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(event) => {
                const order = TABS.map(([value]) => value);
                const index = order.indexOf(tab);
                if (event.key === "ArrowRight") setTab(order[(index + 1) % order.length]!);
                if (event.key === "ArrowLeft") setTab(order[(index - 1 + order.length) % order.length]!);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      ) : null}

      <main className="scroll">
        {state === "analyzing" ? <LoadingState stage={stage} host={result ? hostOf(result.url) : undefined} /> : null}
        {state === "error" && error ? <ErrorState error={error} onRetry={reanalyze} /> : null}
        {state === "success" && result ? (
          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {result.truncated ? (
              <p className="banner" role="status">
                Analysis limited. This page was larger than the configured collection limit. Some results may be
                incomplete.
              </p>
            ) : null}
            {tab === "overview" ? (
              <Overview result={result} counts={counts} why={why} onWhy={() => setWhy((value) => !value)} />
            ) : null}
            {tab === "seo" ? <Seo result={result} detailed={detailed} /> : null}
            {tab === "ai" ? <AiAgents result={result} /> : null}
            {tab === "issues" ? (
              <Issues
                result={result}
                issues={issues}
                filter={filter}
                category={category}
                detailed={detailed}
                onFilter={setFilter}
                onCategory={setCategory}
                onDetailed={setDetailed}
                onInspect={(finding: Finding) => void inspectFinding(finding)}
              />
            ) : null}
          </div>
        ) : null}
      </main>

      {state === "success" && result ? (
        <footer className="footer">
          <button type="button" className="btn btn-sm" onClick={() => void chrome.runtime.sendMessage({ type: "OPEN_REPORT" })}>
            Open full report
          </button>
          <button type="button" className="btn btn-sm" onClick={() => downloadText("agentlens.json", exportJson(result), "application/json")}>
            Export JSON
          </button>
          <button type="button" className="btn btn-sm" onClick={() => downloadText("agentlens.md", exportMarkdown(result), "text/markdown")}>
            Export Markdown
          </button>
        </footer>
      ) : null}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function defaultConnect(): chrome.runtime.Port {
  return chrome.runtime.connect({ name: "agentlens" });
}
