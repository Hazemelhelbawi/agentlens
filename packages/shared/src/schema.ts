import { z } from "zod";
import { CATEGORIES, GRADES, SEVERITIES } from "./categories.js";

export const findingSchema = z.object({
  id: z.string(),
  category: z.enum(CATEGORIES),
  title: z.string(),
  description: z.string(),
  severity: z.enum(SEVERITIES),
  score: z.number(),
  maxScore: z.number(),
  recommendation: z.string().optional(),
  evidence: z
    .object({
      url: z.string().optional(),
      selector: z.string().optional(),
      value: z.string().optional(),
    })
    .optional(),
});

export const analysisResultSchema = z.object({
  url: z.string(),
  timestamp: z.string(),
  score: z.number(),
  grade: z.enum(GRADES),
  categories: z.array(
    z.object({
      id: z.enum(CATEGORIES),
      name: z.string(),
      emoji: z.string(),
      score: z.number(),
      weight: z.number(),
    }),
  ),
  findings: z.array(findingSchema),
  technical: z.object({
    https: z.boolean(),
    statusCode: z.number(),
    redirectCount: z.number(),
    finalUrl: z.string(),
    contentType: z.string().optional(),
    responseTimeMs: z.number(),
    responseBytes: z.number(),
  }),
  crawler: z.object({
    robotsTxt: z.object({
      fetched: z.boolean(),
      statusCode: z.number().optional(),
      parseErrors: z.array(z.string()),
      groups: z.array(
        z.object({
          userAgents: z.array(z.string()),
          allow: z.array(z.string()),
          disallow: z.array(z.string()),
        }),
      ),
      sitemaps: z.array(z.string()),
      crawlers: z.array(
        z.object({
          name: z.string(),
          status: z.enum(["restricted", "allowed", "unspecified"]),
          detail: z.string(),
        }),
      ),
    }),
    sitemap: z.object({
      fetched: z.boolean(),
      statusCode: z.number().optional(),
      validXml: z.boolean(),
      urlCount: z.number(),
      sameOriginCount: z.number(),
      lastmodCount: z.number(),
      declaredInRobots: z.boolean(),
      parseErrors: z.array(z.string()),
    }),
    llmsTxt: z.object({
      path: z.string(),
      fetched: z.boolean(),
      statusCode: z.number().optional(),
      hasTitle: z.boolean(),
      hasDescription: z.boolean(),
      linkCount: z.number(),
    }),
    llmsFullTxt: z.object({
      path: z.string(),
      fetched: z.boolean(),
      statusCode: z.number().optional(),
      hasTitle: z.boolean(),
      hasDescription: z.boolean(),
      linkCount: z.number(),
    }),
  }),
  recommendations: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      category: z.enum(CATEGORIES),
      severity: z.enum(SEVERITIES),
    }),
  ),
});

export type AnalysisResultJson = z.infer<typeof analysisResultSchema>;
