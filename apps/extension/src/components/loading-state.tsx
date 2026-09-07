import type { AnalyzeStage } from "@agentlens/shared";

const STAGES: Array<{ id: AnalyzeStage | "reading-dom"; label: string }> = [
  { id: "reading-dom", label: "Collecting rendered DOM" },
  { id: "analyzing-metadata", label: "Inspecting metadata" },
  { id: "inspecting-semantic-html", label: "Checking semantic structure" },
  { id: "analyzing-structured-data", label: "Checking structured data" },
  { id: "calculating-score", label: "Calculating score" },
];

export function LoadingState({ stage, host }: { stage?: AnalyzeStage | "reading-dom"; host?: string }) {
  const current = STAGES.findIndex((item) => item.id === stage);
  const activeIndex = current >= 0 ? current : 0;
  return (
    <div>
      <p className="kicker">Analyzing current page…</p>
      <h2 className="h1">{host ?? "Current tab"}</h2>
      <p className="sr-only" role="status" aria-live="polite">
        {STAGES[activeIndex]?.label}
      </p>
      <ol className="stages">
        {STAGES.map((item, index) => {
          const done = activeIndex > index;
          const active = activeIndex === index;
          return (
            <li key={item.id} data-done={done ? "1" : "0"} data-active={active ? "1" : "0"}>
              <span aria-hidden>{done ? "✓" : active ? "→" : "○"}</span>
              {item.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
