import type { AnalysisResult, FileFetchStatus } from "@agentlens/shared";
import { KNOWN_AI_CRAWLERS } from "@agentlens/shared";
import { accessToRule, crawlerLabel, ruleFromGroups } from "../../lib/crawler-status.js";
import { TIPS } from "../../lib/severity.js";
import { StatusMark, Tip } from "../status.js";

function llmsStatus(fetched: boolean, statusCode?: number): FileFetchStatus {
  if (fetched) return "found";
  if (statusCode === 404) return "not-found";
  if (statusCode === 0 || (statusCode !== undefined && statusCode >= 400)) return "error";
  return "unknown";
}

export function AiAgents({ result }: { result: AnalysisResult }) {
  const agentUx = result.categories.find((item) => item.id === "agent-ux");
  const robotsFile = result.inspection?.robotsDetail?.status ?? (result.crawler.robotsTxt.fetched ? "found" : "unknown");
  const displayCrawlers = ["Googlebot", ...KNOWN_AI_CRAWLERS];
  const groups = result.crawler.robotsTxt.groups;

  return (
    <div className="stack">
      <div className="card">
        <strong>
          LLM Discoverability <Tip label="LLM Discoverability" text={TIPS["LLM Discoverability"] ?? "LLM Discoverability"} />
        </strong>
        <p className="muted">
          llms.txt is an emerging convention, not a mandatory web standard. Absence does not mean the site is not
          AI-ready.
        </p>
        <div className="kv">
          <div>
            <span>llms.txt</span>
            <StatusMark status={llmsStatus(result.crawler.llmsTxt.fetched, result.crawler.llmsTxt.statusCode)} />
          </div>
          <div>
            <span>llms-full.txt</span>
            <StatusMark
              status={llmsStatus(result.crawler.llmsFullTxt.fetched, result.crawler.llmsFullTxt.statusCode)}
            />
          </div>
        </div>
        {result.inspection?.llmsRaw ? <pre className="source">{result.inspection.llmsRaw}</pre> : null}
      </div>

      <div className="card">
        <strong>AI crawler robots</strong>
        <p className="muted">
          Status is taken from explicit user-agent groups in the fetched robots.txt. Unspecified crawlers are not marked
          Allowed.
        </p>
        <table className="score-table">
          <thead>
            <tr>
              <th>Crawler</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayCrawlers.map((name) => {
              const known = result.crawler.robotsTxt.crawlers.find((item) => item.name === name);
              const status = known
                ? accessToRule(known, robotsFile)
                : ruleFromGroups(groups, name, robotsFile);
              return (
                <tr key={name}>
                  <td>{name}</td>
                  <td>
                    <StatusMark status={status} label={crawlerLabel(status)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <strong>Agent UX</strong>
        <p className="h1">{agentUx ? `${agentUx.score} / 100` : "Unavailable"}</p>
        <p className="muted">
          What does this mean? Agent UX is the shared scoring category for whether links, buttons, headings, forms,
          landmarks, and metadata give an agent clear actions. This number is not recalculated in the extension.
        </p>
      </div>
    </div>
  );
}
