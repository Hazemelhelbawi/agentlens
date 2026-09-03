import { NextResponse } from "next/server";
import { analyzeWebsite, SsrfError } from "@agentlens/core";
import { encodeReportId } from "@/lib/utils";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body with a url field." }, { status: 400 });
  }

  const url = typeof body === "object" && body && "url" in body ? String((body as { url: unknown }).url) : "";
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const result = await analyzeWebsite({ url });
    const id = encodeReportId(result.url);
    return NextResponse.json({ id, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    const status = error instanceof SsrfError ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
