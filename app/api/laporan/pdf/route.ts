import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/rbac";
import { buildReport } from "@/lib/report";
import { parseReportFilter } from "@/lib/report-params";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { formatDateTime } from "@/lib/date";
import { ReportPdf } from "@/lib/pdf/report-pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (!["ADMIN", "PKS", "BK", "KEPSEK"].includes(user.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const f = await parseReportFilter(new URL(req.url).searchParams);
  const [r, s] = await Promise.all([buildReport(f), getSettings()]);
  const buffer = await renderToBuffer(
    createElement(ReportPdf, { r, school: s.schoolName, label: f.label, printedAt: formatDateTime(new Date()) }) as Parameters<typeof renderToBuffer>[0],
  );
  await audit({ userId: user.id, action: "EXPORT", entity: "Report", after: { format: "pdf", filter: f.label } });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="laporan-kesiswaan-${f.from}_${f.to}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
