import { analyzeWebsite, failUnder, SsrfError } from "@agentlens/core";
import { Command } from "commander";
import { formatHuman, formatJson } from "./format.js";

export interface CliOptions {
  json?: boolean;
  failUnder?: string;
  pages?: string;
}

export async function executeCli(url: string, options: CliOptions): Promise<number> {
  const failUnderValue =
    options.failUnder === undefined || options.failUnder === ""
      ? 0
      : Number(options.failUnder);
  if (!Number.isFinite(failUnderValue) || failUnderValue < 0 || failUnderValue > 100) {
    console.error('Invalid --fail-under. Expected a number between 0 and 100.');
    return 2;
  }

  const pages =
    options.pages === undefined || options.pages === "" ? 0 : Number(options.pages);
  if (!Number.isFinite(pages) || pages < 0 || pages > 50) {
    console.error("Invalid --pages. Expected a number between 0 and 50.");
    return 2;
  }

  try {
    const result = await analyzeWebsite({ url, pages });
    if (options.json) {
      console.log(formatJson(result));
    } else {
      console.log(formatHuman(result));
    }

    if (failUnderValue > 0 && failUnder(result.score, failUnderValue)) {
      console.error(`\n❌ AgentLens failed\n\nScore: ${result.score}\nRequired: ${failUnderValue}`);
      return 1;
    }
    return 0;
  } catch (error) {
    if (error instanceof SsrfError) {
      console.error(`Blocked URL: ${error.message}`);
      return 2;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 2;
  }
}

export function createProgram(): Command {
  const program = new Command();
  program
    .name("agentlens")
    .description("See how AI agents see your website.")
    .argument("<url>", "Public http(s) URL to analyze")
    .option("--json", "Print stable machine-readable JSON")
    .option("--fail-under <score>", "Exit 1 when the heuristic score is below this threshold")
    .option("--pages <count>", "Extra same-origin pages to fetch (default 0)", "0")
    .action(async (url: string, options: CliOptions) => {
      const code = await executeCli(url, options);
      process.exitCode = code;
    });
  return program;
}
