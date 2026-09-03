import { analyzeWebsite, SsrfError } from "@agentlens/core";
import { ReportView } from "@/components/report-view";
import { decodeReportId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let url: string;
  try {
    url = decodeReportId(id);
  } catch {
    return <p className="p-8 text-muted">Invalid report id.</p>;
  }

  try {
    const result = await analyzeWebsite({ url });
    return <ReportView result={result} reportId={id} />;
  } catch (error) {
    const message =
      error instanceof SsrfError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Analysis failed.";
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">Could not analyze this URL</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
      </main>
    );
  }
}
