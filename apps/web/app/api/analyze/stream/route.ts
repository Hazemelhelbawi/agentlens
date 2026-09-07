import { analyzeWebsite, SsrfError } from "@agentlens/core";
import type { AnalyzeStage } from "@agentlens/shared";
import { encodeReportId, friendlyError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeEvent(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Expected JSON body with a url field." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const record = typeof body === "object" && body ? (body as { url?: unknown; pages?: unknown }) : {};
  const url = record.url ? String(record.url) : "";
  const pages = Number(record.pages ?? 0);
  if (!url) {
    return new Response(JSON.stringify({ error: "url is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encodeEvent(event, data));
      };
      try {
        const result = await analyzeWebsite({
          url,
          pages: Number.isFinite(pages) ? Math.min(50, Math.max(0, pages)) : 0,
          onStage: (stage: AnalyzeStage) => send("stage", { stage }),
        });
        send("result", { id: encodeReportId(result.url), result });
      } catch (error) {
        const message = friendlyError(error instanceof Error ? error.message : "Analysis failed");
        send("error", { error: message, code: error instanceof SsrfError ? "blocked" : "failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
