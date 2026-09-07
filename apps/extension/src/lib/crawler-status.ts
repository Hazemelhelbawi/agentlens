import type { CrawlerAccess, CrawlerRuleStatus, FileFetchStatus, RobotsGroup } from "@agentlens/shared";

export function fileLabel(status: FileFetchStatus): { text: string; tone: CrawlerRuleStatus | FileFetchStatus } {
  if (status === "found") return { text: "Found", tone: "found" };
  if (status === "not-found") return { text: "Not found", tone: "not-found" };
  if (status === "error") return { text: "Error", tone: "error" };
  return { text: "Unknown", tone: "unknown" };
}

export function crawlerLabel(status: CrawlerRuleStatus): string {
  if (status === "allowed") return "Allowed";
  if (status === "blocked") return "Blocked";
  if (status === "no-specific-rule") return "No specific rule";
  return "Unknown";
}

export function accessToRule(access: CrawlerAccess | undefined, file: FileFetchStatus): CrawlerRuleStatus {
  if (file === "error" || file === "unknown") return "unknown";
  if (!access) return file === "not-found" ? "no-specific-rule" : "unknown";
  if (access.status === "allowed") return "allowed";
  if (access.status === "restricted") return "blocked";
  return "no-specific-rule";
}

export function ruleFromGroups(groups: RobotsGroup[], name: string, file: FileFetchStatus): CrawlerRuleStatus {
  if (file === "error" || file === "unknown") return "unknown";
  const ua = name.toLowerCase();
  const specific = groups.filter((group) =>
    group.userAgents.some((agent) => agent.toLowerCase() === ua),
  );
  if (specific.length === 0) return "no-specific-rule";
  const blocked = specific.some((group) => group.disallow.includes("/") && !group.allow.includes("/"));
  const allowed = specific.some((group) => group.allow.length > 0 && group.disallow.every((rule) => rule !== "/"));
  if (blocked) return "blocked";
  if (allowed) return "allowed";
  return "blocked";
}
