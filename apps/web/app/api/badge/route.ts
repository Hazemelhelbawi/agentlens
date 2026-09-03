import { NextResponse } from "next/server";
import { analyzeWebsite } from "@agentlens/core";
import { gradeColor } from "@/lib/utils";

export const revalidate = 3600;

function svgBadge(label: string, value: string, color: string): string {
  const labelWidth = 74;
  const valueWidth = 54;
  const width = labelWidth + valueWidth;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <rect width="${labelWidth}" height="20" fill="#24292f"/>
  <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
  <rect width="${width}" height="20" fill="url(#s)"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url query parameter", { status: 400 });
  }

  try {
    const result = await analyzeWebsite({ url });
    const body = svgBadge("AgentLens", `${result.score}/100`, gradeColor(result.score));
    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=600, s-maxage=3600",
      },
    });
  } catch {
    const body = svgBadge("AgentLens", "error", "#6e7681");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}
