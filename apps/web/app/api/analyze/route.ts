import { NextResponse } from "next/server";
import { analyzeWebsite, SsrfError } from "@agentlens/core";
import { encodeReportId, friendlyError } from "@/lib/utils";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body with a url field." }, { status: 400 });
  }

  const record = typeof body === "object" && body ? (body as { url?: unknown; pages?: unknown }) : {};
  const url = record.url ? String(record.url) : "";
  const pages = Number(record.pages ?? 0);
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const result = await analyzeWebsite({
      url,
      pages: Number.isFinite(pages) ? Math.min(50, Math.max(0, pages)) : 0,
    });
    const id = encodeReportId(result.url);
    return NextResponse.json({ id, result });
  } catch (error) {
    const message = friendlyError(error instanceof Error ? error.message : "Analysis failed");
    const status = error instanceof SsrfError ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
