import type { AnalyzerRule } from "../types.js";
import { agentUxRule } from "./agent-ux.js";
import {
  titleRule,
  descriptionRule,
  textContentRule,
  csrDetectionRule,
} from "./content-access.js";
import {
  httpStatusRule,
  httpsRule,
  redirectsRule,
  robotsTxtRule,
  sitemapRule,
  canonicalRule,
  indexabilityRule,
} from "./crawlability.js";
import { linksRule } from "./links.js";
import { llmsTxtRule, llmsFullTxtRule, aiCrawlersRule } from "./llm-discoverability.js";
import { headingsRule, landmarksRule, imagesRule, formsRule } from "./semantic-html.js";
import { jsonLdRule } from "./structured-data.js";
import {
  viewportRule,
  openGraphRule,
  twitterMetaRule,
  robotsMetaRule,
  responseHygieneRule,
} from "./technical-seo.js";

export const rules: AnalyzerRule[] = [
  httpStatusRule,
  httpsRule,
  redirectsRule,
  robotsTxtRule,
  sitemapRule,
  canonicalRule,
  indexabilityRule,
  titleRule,
  descriptionRule,
  textContentRule,
  csrDetectionRule,
  headingsRule,
  landmarksRule,
  imagesRule,
  formsRule,
  jsonLdRule,
  llmsTxtRule,
  llmsFullTxtRule,
  aiCrawlersRule,
  linksRule,
  agentUxRule,
  viewportRule,
  openGraphRule,
  twitterMetaRule,
  robotsMetaRule,
  responseHygieneRule,
];

export function getRule(id: string): AnalyzerRule | undefined {
  return rules.find((rule) => rule.id === id);
}

export function registerRule(rule: AnalyzerRule): void {
  if (rules.some((existing) => existing.id === rule.id)) {
    throw new Error(`Rule already registered: ${rule.id}`);
  }
  rules.push(rule);
}
