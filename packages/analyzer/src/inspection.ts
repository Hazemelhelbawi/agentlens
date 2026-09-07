import type { AnalysisInspection, AnalyzedPage } from "@agentlens/shared";
import type { CrawlResult, PageSnapshot } from "@agentlens/crawler";
import {
  buildHeadingInspection,
  buildImageIndex,
  buildJsonLd,
  buildLinkIndex,
  buildRobotsDetail,
  buildSchemaSnapshot,
  buildSeoSnapshot,
  buildSitemapSnapshot,
} from "./seo-inspection.js";

const LANDMARKS = ["header", "nav", "main", "article", "section", "aside", "footer"] as const;

function pageRecord(page: PageSnapshot): AnalyzedPage {
  let path = "/";
  try {
    path = new URL(page.finalUrl).pathname || "/";
  } catch {
    path = "/";
  }
  return {
    url: page.finalUrl,
    path,
    statusCode: page.statusCode,
    title: page.$("title").first().text().trim() || undefined,
  };
}

export function buildInspection(crawl: CrawlResult): AnalysisInspection {
  const page = crawl.homepage;
  const landmarks: Record<string, number> = {};
  for (const tag of LANDMARKS) {
    landmarks[tag] = page.$(tag).length;
  }

  const seo = buildSeoSnapshot(page);
  const headings = buildHeadingInspection(page, crawl);
  const links = buildLinkIndex(page, crawl);
  const images = buildImageIndex(page, crawl);
  const jsonLd = buildJsonLd(page, crawl);
  const schema = buildSchemaSnapshot(page, jsonLd);
  const sitemap = buildSitemapSnapshot(crawl, page.finalUrl, seo.canonical.href);

  return {
    headings: headings.headings,
    landmarks,
    links: links.links,
    images: images.images,
    jsonLd,
    sitemapUrls: sitemap.sitemapUrls,
    robotsRaw: crawl.robotsBody ?? undefined,
    sitemapRaw: crawl.sitemapBody ?? undefined,
    llmsRaw: crawl.llmsTxtBody ?? undefined,
    llmsFullRaw: crawl.llmsFullTxtBody ?? undefined,
    pages: [pageRecord(page), ...crawl.extraPages.map(pageRecord)],
    seo,
    headingCounts: headings.headingCounts,
    headingWarnings: headings.headingWarnings,
    linkIndex: links.linkIndex,
    imageIndex: images.imageIndex,
    schema,
    sitemapMeta: sitemap.sitemapMeta,
    robotsDetail: buildRobotsDetail(crawl, page.finalUrl),
  };
}
