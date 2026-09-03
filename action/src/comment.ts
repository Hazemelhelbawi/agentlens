import * as core from "@actions/core";
import * as github from "@actions/github";
import type { AnalysisResult } from "@agentlens/shared";
import { formatPrComment, REPORT_MARKER } from "./format.js";

export function findExistingComment<T extends { id: number; body?: string | null }>(
  comments: T[],
): T | undefined {
  return comments.find((comment) => comment.body?.includes(REPORT_MARKER));
}

export async function upsertPrComment(
  token: string,
  result: AnalysisResult,
): Promise<void> {
  const { context } = github;
  const prNumber = context.payload.pull_request?.number;
  if (!prNumber) {
    core.info("Not a pull_request event — skipping comment.");
    return;
  }

  const octokit = github.getOctokit(token);
  const body = formatPrComment(result);
  const { owner, repo } = context.repo;

  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existing = findExistingComment(comments);

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    core.info(`Updated AgentLens PR comment (#${existing.id}).`);
    return;
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
  core.info("Created AgentLens PR comment.");
}
