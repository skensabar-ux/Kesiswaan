import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/rbac";
import { buildTemplateWorkbook } from "@/lib/import/students";

export async function GET() {
  const user = await getSessionUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const wb = await buildTemplateWorkbook();
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-siswa-ortu.xlsx"',
    },
  });
}
