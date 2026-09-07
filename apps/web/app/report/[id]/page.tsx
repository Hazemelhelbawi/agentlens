import type { Metadata } from "next";
import { ReportLoader } from "@/components/report/report-loader";
import { decodeReportId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const url = decodeReportId(id);
    const host = new URL(url).hostname;
    return {
      title: `AgentLens report — ${host}`,
      description: `Heuristic AI readiness report for ${url}. Not an official ranking from any AI provider or search engine.`,
      openGraph: {
        title: `AgentLens report — ${host}`,
        description: `Deterministic machine-readability audit for ${url}`,
        url: `/report/${id}`,
      },
    };
  } catch {
    return { title: "AgentLens report" };
  }
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let url: string;
  try {
    url = decodeReportId(id);
  } catch {
    return <p className="p-8 text-muted">Invalid report id.</p>;
  }

  return <ReportLoader id={id} url={url} />;
}
