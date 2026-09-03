import * as core from "@actions/core";

export interface ActionInputs {
  url: string;
  failUnder: number;
  comment: boolean;
  annotations: boolean;
  pages: number;
  githubToken: string;
}

function boolInput(name: string, fallback: boolean): boolean {
  const raw = core.getInput(name);
  if (!raw) return fallback;
  return raw.toLowerCase() === "true" || raw === "1";
}

function numberInput(name: string, fallback: number): number {
  const raw = core.getInput(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Input "${name}" must be a number (got "${raw}")`);
  }
  return value;
}

export function readInputs(): ActionInputs {
  const url = core.getInput("url", { required: true }).trim();
  if (!url) {
    throw new Error('Input "url" is required');
  }

  const failUnder = numberInput("fail-under", 0);
  if (failUnder < 0 || failUnder > 100) {
    throw new Error('Input "fail-under" must be between 0 and 100');
  }

  const pages = numberInput("pages", 0);
  if (pages < 0 || pages > 50) {
    throw new Error('Input "pages" must be between 0 and 50');
  }

  return {
    url,
    failUnder,
    comment: boolInput("comment", true),
    annotations: boolInput("annotations", true),
    pages,
    githubToken: core.getInput("github-token") || process.env.GITHUB_TOKEN || "",
  };
}

export function parseInputsFromRecord(record: Record<string, string | undefined>): {
  url: string;
  failUnder: number;
  comment: boolean;
  annotations: boolean;
  pages: number;
} {
  const url = (record.url ?? "").trim();
  if (!url) throw new Error('Input "url" is required');

  const failUnder = record["fail-under"] === undefined || record["fail-under"] === ""
    ? 0
    : Number(record["fail-under"]);
  if (!Number.isFinite(failUnder) || failUnder < 0 || failUnder > 100) {
    throw new Error('Input "fail-under" must be between 0 and 100');
  }

  const pages = record.pages === undefined || record.pages === "" ? 0 : Number(record.pages);
  if (!Number.isFinite(pages) || pages < 0 || pages > 50) {
    throw new Error('Input "pages" must be between 0 and 50');
  }

  const toBool = (value: string | undefined, fallback: boolean) => {
    if (value === undefined || value === "") return fallback;
    return value.toLowerCase() === "true" || value === "1";
  };

  return {
    url,
    failUnder,
    comment: toBool(record.comment, true),
    annotations: toBool(record.annotations, true),
    pages,
  };
}
