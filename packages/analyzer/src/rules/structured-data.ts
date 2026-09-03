import type { AnalyzerContext, AnalyzerRule } from "../types.js";
import { finding } from "../types.js";

const RECOGNIZED_TYPES = new Set([
  "Organization",
  "WebSite",
  "WebPage",
  "Article",
  "Product",
  "BreadcrumbList",
  "Person",
  "LocalBusiness",
  "Event",
  "FAQPage",
]);

const BASIC_FIELDS: Record<string, string[]> = {
  Organization: ["name"],
  WebSite: ["name"],
  WebPage: ["name"],
  Article: ["headline"],
  Product: ["name"],
  BreadcrumbList: ["itemListElement"],
  Person: ["name"],
  LocalBusiness: ["name"],
  Event: ["name", "startDate"],
  FAQPage: ["mainEntity"],
};

interface JsonLdNode {
  "@type"?: string | string[];
  "@graph"?: JsonLdNode[];
  [key: string]: unknown;
}

function typesOf(node: JsonLdNode): string[] {
  const value = node["@type"];
  if (typeof value === "string") return [value.split("/").pop() ?? value];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string").map((v) => v.split("/").pop() ?? v);
  }
  return [];
}

function flatten(node: unknown, out: JsonLdNode[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) flatten(item, out);
    return;
  }
  const record = node as JsonLdNode;
  out.push(record);
  if (record["@graph"]) flatten(record["@graph"], out);
}

export const jsonLdRule: AnalyzerRule = {
  id: "json-ld",
  category: "structured-data",
  check(ctx: AnalyzerContext) {
    const scripts = ctx.$('script[type="application/ld+json"]');
    if (scripts.length === 0) {
      return [
        finding({
          id: "json-ld",
          category: "structured-data",
          title: "JSON-LD",
          description: "No JSON-LD structured data was found. This is not a complete Schema.org validator.",
          severity: "warning",
          score: 4,
          maxScore: 20,
          recommendation:
            "Add JSON-LD for Organization, WebSite, or WebPage so agents can identify the entity behind the URL.",
        }),
      ];
    }

    const nodes: JsonLdNode[] = [];
    let malformed = 0;
    scripts.each((_, el) => {
      const raw = ctx.$(el).contents().text();
      try {
        flatten(JSON.parse(raw) as unknown, nodes);
      } catch {
        malformed += 1;
      }
    });

    const typeSet = new Set<string>();
    const missingFields: string[] = [];
    for (const node of nodes) {
      for (const type of typesOf(node)) {
        typeSet.add(type);
        const required = BASIC_FIELDS[type];
        if (!required) continue;
        for (const field of required) {
          if (node[field] === undefined) missingFields.push(`${type}.${field}`);
        }
      }
    }

    const recognized = [...typeSet].filter((t) => RECOGNIZED_TYPES.has(t));
    let score = 8;
    if (malformed === 0) score += 4;
    if (recognized.length > 0) score += 4;
    if (recognized.length >= 2) score += 2;
    if (missingFields.length === 0 && nodes.length > 0) score += 2;
    score = Math.min(20, score);

    if (malformed > 0 && nodes.length === 0) {
      return [
        finding({
          id: "json-ld",
          category: "structured-data",
          title: "JSON-LD",
          description: `${malformed} malformed JSON-LD block(s) could not be parsed.`,
          severity: "critical",
          score: 2,
          maxScore: 20,
          recommendation: "Fix malformed JSON in application/ld+json script tags.",
        }),
      ];
    }

    const typeList = [...typeSet].slice(0, 8).join(", ") || "untyped";
    return [
      finding({
        id: "json-ld",
        category: "structured-data",
        title: "JSON-LD",
        description: `Parsed ${nodes.length} node(s). Types: ${typeList}.${
          malformed ? ` ${malformed} malformed block(s).` : ""
        }${missingFields.length ? ` Missing basic fields: ${missingFields.slice(0, 5).join(", ")}.` : ""} This check is not complete Schema.org validation.`,
        severity: malformed || missingFields.length ? "info" : "pass",
        score: malformed ? Math.min(score, 12) : score,
        maxScore: 20,
        recommendation:
          recognized.length === 0
            ? "Include a recognized type such as Organization, WebSite, or Article."
            : undefined,
        evidence: { value: typeList },
      }),
    ];
  },
};
