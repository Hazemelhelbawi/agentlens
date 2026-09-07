import type { AnalysisResult, AnalyzeStage, Finding, InspectTarget } from "@agentlens/shared";

export type ExtensionState = "idle" | "analyzing" | "success" | "error";

export interface ExtensionError {
  title: string;
  reason: string;
  hint?: string;
}

export interface InspectPayload {
  title: string;
  description: string;
  why?: string;
  detected?: string;
  fix?: string;
  selector?: string;
  targets?: InspectTarget[];
}

export interface InspectResult {
  found: boolean;
  reason?: string;
}

export type PopupToBackground =
  | { type: "ANALYZE"; force?: boolean }
  | { type: "GET_STATE" }
  | { type: "INSPECT"; payload: InspectPayload }
  | { type: "OPEN_REPORT" }
  | { type: "GET_LAST_RESULT" };

export type BackgroundToPopup =
  | { type: "STATE"; state: ExtensionState; url?: string }
  | { type: "STAGE"; stage: AnalyzeStage | "reading-dom" }
  | { type: "RESULT"; result: AnalysisResult; cached?: boolean }
  | { type: "ERROR"; error: ExtensionError }
  | { type: "LAST_RESULT"; result: AnalysisResult | null };

export const COLLECT_TYPE = "AGENTLENS_COLLECT";
export const INSPECT_TYPE = "AGENTLENS_INSPECT";

export function findingTargets(finding: Finding): InspectTarget[] {
  return finding.inspectTargets ?? [];
}
