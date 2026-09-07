import { z } from "zod";
import { CATEGORIES, GRADES, SEVERITIES } from "./categories.js";

const seoStatusSchema = z.enum(["pass", "warning", "fail", "info", "unknown"]);
const fileStatusSchema = z.enum(["found", "not-found", "error", "unknown"]);
const seoFieldSchema = z.object({
  value: z.string().optional(),
  length: z.number().optional(),
  status: seoStatusSchema,
  notes: z.array(z.string()),
});

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
      snippet: z.string().optional(),
      source: z.string().optional(),
      line: z.number().optional(),
      location: z.string().optional(),
      precision: z.enum(["line", "selector", "url", "document"]).optional(),
      tagName: z.string().optional(),
      text: z.string().optional(),
      inspectable: z.boolean().optional(),
    })
    .optional(),
  whyItMatters: z.string().optional(),
  recommendedFix: z.string().optional(),
  detectedSnippet: z.string().optional(),
  affectedPages: z.array(z.string()).optional(),
  scoreImpact: z.number().optional(),
  inspectTargets: z
    .array(
      z.object({
        ruleId: z.string(),
        selector: z.string(),
        unique: z.boolean(),
        tagName: z.string(),
        text: z.string().optional(),
        snippet: z.string().optional(),
        href: z.string().optional(),
      }),
    )
    .optional(),
});

const crawlerAccessSchema = z.object({
  name: z.string(),
  status: z.enum(["restricted", "allowed", "unspecified"]),
  detail: z.string(),
  snippet: z.string().optional(),
  line: z.number().optional(),
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
      crawlers: z.array(crawlerAccessSchema),
      host: z.array(z.string()).optional(),
      otherDirectives: z
        .array(z.object({ field: z.string(), value: z.string() }))
        .optional(),
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
  inspection: z
    .object({
      headings: z.array(
        z.object({
          level: z.number(),
          text: z.string(),
          tag: z.string().optional(),
          empty: z.boolean().optional(),
          selector: z.string().optional(),
          unique: z.boolean().optional(),
        }),
      ),
      landmarks: z.record(z.string(), z.number()),
      links: z.object({
        total: z.number(),
        descriptive: z.number(),
        generic: z.number(),
        empty: z.number(),
        issues: z.array(
          z.object({
            href: z.string(),
            text: z.string(),
            kind: z.enum(["generic", "empty"]),
            rel: z.string().optional(),
            internal: z.boolean().optional(),
            nofollow: z.boolean().optional(),
            sponsored: z.boolean().optional(),
            ugc: z.boolean().optional(),
            selector: z.string().optional(),
            unique: z.boolean().optional(),
          }),
        ),
      }),
      images: z.object({
        total: z.number(),
        withAlt: z.number(),
        missingAlt: z.number(),
        emptyAlt: z.number(),
        decorative: z.number(),
        issues: z.array(
          z.object({
            src: z.string().optional(),
            alt: z.string().optional(),
            kind: z.enum(["missing", "empty"]),
            width: z.string().optional(),
            height: z.string().optional(),
            loading: z.string().optional(),
            inLink: z.boolean().optional(),
            selector: z.string().optional(),
            unique: z.boolean().optional(),
          }),
        ),
      }),
      jsonLd: z.array(
        z.object({
          index: z.number(),
          types: z.array(z.string()),
          valid: z.boolean(),
          raw: z.string(),
          missingFields: z.array(z.string()),
          selector: z.string().optional(),
          unique: z.boolean().optional(),
        }),
      ),
      sitemapUrls: z.array(
        z.object({
          loc: z.string(),
          lastmod: z.string().optional(),
          sameOrigin: z.boolean(),
        }),
      ),
      robotsRaw: z.string().optional(),
      sitemapRaw: z.string().optional(),
      llmsRaw: z.string().optional(),
      llmsFullRaw: z.string().optional(),
      pages: z.array(
        z.object({
          url: z.string(),
          path: z.string(),
          statusCode: z.number(),
          title: z.string().optional(),
        }),
      ),
      seo: z
        .object({
          url: z.object({
            href: z.string(),
            protocol: z.string(),
            https: z.boolean(),
            hostname: z.string(),
            pathname: z.string(),
            search: z.string().optional(),
          }),
          title: seoFieldSchema,
          description: seoFieldSchema,
          canonical: z.object({
            href: z.string().optional(),
            count: z.number(),
            absolute: z.boolean().optional(),
            matchesCurrent: z.boolean().optional(),
            status: seoStatusSchema,
            notes: z.array(z.string()),
          }),
          robotsMeta: z.object({
            content: z.string().optional(),
            directives: z.array(z.string()),
          }),
          language: seoFieldSchema,
          charset: seoFieldSchema,
          viewport: seoFieldSchema,
        })
        .optional(),
      headingCounts: z.record(z.string(), z.number()).optional(),
      headingWarnings: z.array(z.string()).optional(),
      linkIndex: z
        .object({
          total: z.number(),
          internal: z.number(),
          external: z.number(),
          unknownOrigin: z.number(),
          nofollow: z.number(),
          sponsored: z.number(),
          ugc: z.number(),
          generic: z.number(),
          empty: z.number(),
          javascript: z.number(),
          imageOnly: z.number(),
          items: z.array(
            z.object({
              href: z.string(),
              text: z.string(),
              rel: z.string().optional(),
              internal: z.boolean().optional(),
              nofollow: z.boolean().optional(),
              sponsored: z.boolean().optional(),
              ugc: z.boolean().optional(),
              kind: z.enum(["ok", "generic", "empty", "javascript", "image-only"]),
              selector: z.string().optional(),
              unique: z.boolean().optional(),
            }),
          ),
        })
        .optional(),
      imageIndex: z
        .object({
          total: z.number(),
          withAlt: z.number(),
          missingAlt: z.number(),
          emptyAlt: z.number(),
          decorative: z.number(),
          withDimensions: z.number(),
          withoutDimensions: z.number(),
          lazy: z.number(),
          imageLinks: z.number(),
          items: z.array(
            z.object({
              src: z.string().optional(),
              alt: z.string().optional(),
              altKind: z.enum(["present", "missing", "empty"]),
              width: z.string().optional(),
              height: z.string().optional(),
              loading: z.string().optional(),
              inLink: z.boolean().optional(),
              selector: z.string().optional(),
              unique: z.boolean().optional(),
            }),
          ),
        })
        .optional(),
      schema: z
        .object({
          jsonLdCount: z.number(),
          microdataCount: z.number(),
          rdfaCount: z.number(),
          types: z.array(z.string()),
        })
        .optional(),
      sitemapMeta: z
        .object({
          status: fileStatusSchema,
          url: z.string().optional(),
          isIndex: z.boolean().optional(),
          urlCount: z.number(),
          childSitemaps: z.array(z.string()),
          duplicateCount: z.number(),
          missingLocCount: z.number(),
          invalidUrlCount: z.number(),
          canonicalInSitemap: z.boolean().optional(),
        })
        .optional(),
      robotsDetail: z
        .object({
          status: fileStatusSchema,
          url: z.string().optional(),
          host: z.array(z.string()),
          otherDirectives: z.array(z.object({ field: z.string(), value: z.string() })),
        })
        .optional(),
    })
    .optional(),
  breakdown: z
    .array(
      z.object({
        id: z.enum(CATEGORIES),
        name: z.string(),
        weight: z.number(),
        score: z.number(),
        points: z.number(),
        checks: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            score: z.number(),
            maxScore: z.number(),
            severity: z.enum(SEVERITIES),
          }),
        ),
      }),
    )
    .optional(),
  insights: z
    .object({
      summary: z.string(),
      strongest: z.array(z.string()),
      weakest: z.array(z.string()),
      topActions: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          severity: z.enum(SEVERITIES),
          scoreImpact: z.number(),
          affectedPages: z.number(),
        }),
      ),
    })
    .optional(),
  domStats: z
    .object({
      links: z.number(),
      buttons: z.number(),
      images: z.number(),
      headings: z.number(),
      forms: z.number(),
      jsonLd: z.number(),
      inputs: z.number(),
    })
    .optional(),
  source: z.enum(["crawler", "extension"]).optional(),
  language: z.string().optional(),
  truncated: z.boolean().optional(),
});

export type AnalysisResultJson = z.infer<typeof analysisResultSchema>;
