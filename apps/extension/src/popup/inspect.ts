import type { Finding } from "@agentlens/shared";
import type { InspectPayload } from "../lib/messages.js";

export async function inspectPayload(payload: InspectPayload): Promise<void> {
  await chrome.runtime.sendMessage({ type: "INSPECT", payload });
  window.close();
}

export async function inspectFinding(finding: Finding): Promise<void> {
  const unique = (finding.inspectTargets ?? []).filter((item) => item.unique);
  await inspectPayload({
    title: finding.title,
    description: finding.description,
    why: finding.whyItMatters,
    detected: unique[0]?.text ?? finding.evidence?.text ?? finding.detectedSnippet,
    fix: finding.recommendedFix,
    selector: unique[0]?.selector,
    targets: unique,
  });
}

export async function inspectUnique(options: {
  title: string;
  description: string;
  why?: string;
  detected?: string;
  fix?: string;
  selector?: string;
  unique?: boolean;
  tagName?: string;
}): Promise<void> {
  if (!options.selector || options.unique !== true) return;
  await inspectPayload({
    title: options.title,
    description: options.description,
    why: options.why,
    detected: options.detected,
    fix: options.fix,
    selector: options.selector,
    targets: [
      {
        ruleId: "seo-inspect",
        selector: options.selector,
        unique: true,
        tagName: options.tagName ?? "div",
        text: options.detected,
        snippet: options.detected,
      },
    ],
  });
}
