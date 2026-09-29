import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/rbac";
import { buildReport } from "@/lib/report";
import { parseReportFilter } from "@/lib/report-params";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function sheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number }[], rows: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns;
  const h = ws.getRow(1);
  h.font = { bold: true, color: { argb: "FFFFFFFF" } };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5BB7" } };
  rows.forEach((r) => ws.addRow(r));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (!["ADMIN", "PKS", "BK", "KEPSEK"].includes(user.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const f = await parseReportFilter(new URL(req.url).searchParams);
  const [r, s] = await Promise.all([buildReport(f), getSettings()]);

  const wb = new ExcelJS.Workbook();
  wb.creator = s.schoolName;
  const sum = wb.addWorksheet("Ringkasan");
  sum.columns = [{ width: 28 }, { width: 60 }];
  [
    ["Laporan Kesiswaan", s.schoolName],
    ["Periode / filter", f.label],
    ["Dibuat", new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", dateStyle: "full", timeStyle: "short" }).format(new Date())],
    [],
    ["Jumlah kejadian", r.totals.incidents],
    ["Jumlah pelanggaran (siswa × jenis)", r.totals.violations],
    ["Total poin", r.totals.points],
    ["Siswa terlibat", r.totals.students],
    ["Prestasi tercatat", r.totals.achievements],
  ].forEach((row, i) => {
    const x = sum.addRow(row);
    if (i === 0) x.font = { bold: true, size: 14 };
  });
  sheet(
    wb,
    "Per Siswa",
    [
      { header: "No", key: "no", width: 6 },
      { header: "Nama", key: "name", width: 32 },
      { header: "NISN", key: "nisn", width: 14 },
      { header: "Kelas", key: "className", width: 14 },
      { header: "Pelanggaran", key: "count", width: 12 },
      { header: "Berat", key: "berat", width: 8 },
      { header: "Poin", key: "points", width: 8 },
    ],
    r.students.map((x, i) => ({ no: i + 1, ...x })),
  );
  sheet(
    wb,
    "Per Jenis",
    [
      { header: "Jenis pelanggaran", key: "name", width: 40 },
      { header: "Kategori", key: "level", width: 10 },
      { header: "Jumlah", key: "count", width: 10 },
      { header: "Poin", key: "points", width: 10 },
    ],
    r.types,
  );
  sheet(
    wb,
    "Per Kelas",
    [
      { header: "Kelas", key: "name", width: 16 },
      { header: "Siswa terlibat", key: "students", width: 14 },
      { header: "Pelanggaran", key: "count", width: 12 },
      { header: "Poin", key: "points", width: 10 },
    ],
    r.classes,
  );
  sheet(
    wb,
    "Per Jurusan",
    [
      { header: "Jurusan", key: "name", width: 16 },
      { header: "Pelanggaran", key: "count", width: 12 },
      { header: "Poin", key: "points", width: 10 },
    ],
    r.majors,
  );
  const buf = await wb.xlsx.writeBuffer();
  await audit({ userId: user.id, action: "EXPORT", entity: "Report", after: { format: "xlsx", filter: f.label } });
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-kesiswaan-${f.from}_${f.to}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
