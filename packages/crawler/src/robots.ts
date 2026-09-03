import type { CrawlerAccess, RobotsGroup, RobotsTxtAnalysis } from "@agentlens/shared";
import { KNOWN_AI_CRAWLERS } from "@agentlens/shared";

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
  parseErrors: string[];
}

export function parseRobotsTxt(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  const parseErrors: string[] = [];

  let current: RobotsGroup | null = null;
  let pendingUserAgents: string[] = [];

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const hash = trimmed.indexOf("#");
    const withoutComment = (hash >= 0 ? trimmed.slice(0, hash) : trimmed).trim();
    const colon = withoutComment.indexOf(":");
    if (colon < 1) {
      parseErrors.push(`Line ${i + 1}: missing directive separator`);
      continue;
    }

    const field = withoutComment.slice(0, colon).trim().toLowerCase();
    const value = withoutComment.slice(colon + 1).trim();

    if (field === "user-agent") {
      if (!value) {
        parseErrors.push(`Line ${i + 1}: empty user-agent`);
        continue;
      }
      if (current && current.userAgents.length > 0 && (current.allow.length > 0 || current.disallow.length > 0)) {
        groups.push(current);
        current = null;
        pendingUserAgents = [];
      }
      pendingUserAgents.push(value);
      current = current ?? { userAgents: [], allow: [], disallow: [] };
      current.userAgents = [...pendingUserAgents];
      continue;
    }

    if (field === "sitemap") {
      if (value) sitemaps.push(value);
      else parseErrors.push(`Line ${i + 1}: empty sitemap URL`);
      continue;
    }

    if (field === "allow" || field === "disallow") {
      if (!current) {
        parseErrors.push(`Line ${i + 1}: ${field} without a preceding user-agent`);
        continue;
      }
      current[field].push(value);
      pendingUserAgents = [];
      continue;
    }
  }

  if (current && current.userAgents.length > 0) {
    groups.push(current);
  }

  return { groups, sitemaps, parseErrors };
}

function longestMatchingRule(
  path: string,
  rules: string[],
): { rule: string; length: number } | null {
  let best: { rule: string; length: number } | null = null;
  for (const rule of rules) {
    if (rule === "") continue;
    const prefix = rule.endsWith("$") ? rule.slice(0, -1) : rule;
    const matches = rule.endsWith("$") ? path === prefix : path.startsWith(prefix);
    if (matches && (!best || prefix.length > best.length)) {
      best = { rule, length: prefix.length };
    }
  }
  return best;
}

export function isPathAllowed(groups: RobotsGroup[], userAgent: string, path: string): boolean {
  const ua = userAgent.toLowerCase();
  const matching = groups.filter((g) =>
    g.userAgents.some((name) => name === "*" || name.toLowerCase() === ua),
  );
  const specific = matching.filter((g) =>
    g.userAgents.some((name) => name.toLowerCase() === ua),
  );
  const applicable = specific.length > 0 ? specific : matching.filter((g) =>
    g.userAgents.some((name) => name === "*"),
  );

  if (applicable.length === 0) return true;

  let allowBest: { rule: string; length: number } | null = null;
  let disallowBest: { rule: string; length: number } | null = null;

  for (const group of applicable) {
    const allow = longestMatchingRule(path, group.allow);
    const disallow = longestMatchingRule(path, group.disallow);
    if (allow && (!allowBest || allow.length > allowBest.length)) allowBest = allow;
    if (disallow && (!disallowBest || disallow.length > disallowBest.length)) {
      disallowBest = disallow;
    }
  }

  if (!disallowBest) return true;
  if (!allowBest) return false;
  return allowBest.length >= disallowBest.length;
}

function crawlerStatus(groups: RobotsGroup[], name: string): CrawlerAccess {
  const ua = name.toLowerCase();
  const specific = groups.filter((g) =>
    g.userAgents.some((agent) => agent.toLowerCase() === ua),
  );

  if (specific.length === 0) {
    return {
      name,
      status: "unspecified",
      detail: "No explicit restriction detected",
    };
  }

  const blocked = specific.some((g) => g.disallow.includes("/") && !g.allow.includes("/"));
  const explicitlyAllowed = specific.some(
    (g) => g.allow.length > 0 && g.disallow.every((d) => d !== "/"),
  );

  if (blocked) {
    return {
      name,
      status: "restricted",
      detail: `User-agent ${name} is disallowed from /`,
    };
  }

  if (explicitlyAllowed) {
    return {
      name,
      status: "allowed",
      detail: `User-agent ${name} has an explicit allow rule`,
    };
  }

  return {
    name,
    status: "restricted",
    detail: `User-agent ${name} has a dedicated group in robots.txt`,
  };
}

export function analyzeRobotsTxt(
  text: string | null,
  statusCode?: number,
): RobotsTxtAnalysis {
  if (text === null) {
    return {
      fetched: false,
      statusCode,
      parseErrors: [],
      groups: [],
      sitemaps: [],
      crawlers: KNOWN_AI_CRAWLERS.map((name) => ({
        name,
        status: "unspecified" as const,
        detail: "No explicit restriction detected",
      })),
    };
  }

  const parsed = parseRobotsTxt(text);
  return {
    fetched: true,
    statusCode,
    parseErrors: parsed.parseErrors,
    groups: parsed.groups,
    sitemaps: parsed.sitemaps,
    crawlers: KNOWN_AI_CRAWLERS.map((name) => crawlerStatus(parsed.groups, name)),
  };
}
