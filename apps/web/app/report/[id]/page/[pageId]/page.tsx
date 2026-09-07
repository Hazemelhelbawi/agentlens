import { PageDetail } from "@/components/report/page-detail";
import { decodePageId, decodeReportId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportPageDetail({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const { id, pageId } = await params;
  let siteUrl: string;
  let pageUrl: string;
  try {
    siteUrl = decodeReportId(id);
    pageUrl = decodePageId(pageId);
  } catch {
    return <p className="p-8 text-muted">Invalid report or page id.</p>;
  }
  return <PageDetail reportId={id} siteUrl={siteUrl} pageUrl={pageUrl} />;
}
