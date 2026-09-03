import * as core from "@actions/core";
import { analyzeWebsite, failUnder, SsrfError } from "@agentlens/core";
import { createAnnotations } from "./annotations.js";
import { upsertPrComment } from "./comment.js";
import { formatFailMessage, formatJobSummary } from "./format.js";
import { readInputs } from "./inputs.js";

export async function run(): Promise<void> {
  try {
    const inputs = readInputs();
    core.info(`Analyzing ${inputs.url}`);

    const result = await analyzeWebsite({
      url: inputs.url,
      pages: inputs.pages,
    });

    core.setOutput("score", String(result.score));
    core.setOutput("grade", result.grade);
    core.setOutput("json", JSON.stringify(result));

    await core.summary.addRaw(formatJobSummary(result)).write();

    if (inputs.comment && inputs.githubToken) {
      await upsertPrComment(inputs.githubToken, result);
    } else if (inputs.comment) {
      core.warning("comment is enabled but no github-token was provided.");
    }

    if (inputs.annotations) {
      createAnnotations(result);
    }

    if (inputs.failUnder > 0 && failUnder(result.score, inputs.failUnder)) {
      core.setFailed(formatFailMessage(result.score, inputs.failUnder));
      return;
    }

    core.info(`AgentLens score ${result.score}/100 (${result.grade})`);
  } catch (error) {
    if (error instanceof SsrfError) {
      core.setFailed(`Blocked URL: ${error.message}`);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
  }
}
