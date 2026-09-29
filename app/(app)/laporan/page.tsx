import { FileSpreadsheet, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { buildReport } from "@/lib/report";
import { parseReportFilter } from "@/lib/report-params";
import { PageHeader } from "@/components/page-header";
import { DateRangeFilter } from "@/components/date-range-filter";
import { FilterSelect } from "@/components/filter-select";
import { LevelBadge } from "@/components/level-badge";
import { SimpleBarChart } from "@/components/charts/simple-bar-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Laporan" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePageRole("ADMIN", "PKS", "BK", "KEPSEK");
  const params = await searchParams;
  const f = await parseReportFilter(params);
  const [r, classes] = await Promise.all([
    buildReport(f),
    prisma.class.findMany({ where: { academicYear: { isActive: true } }, orderBy: [{ grade: "asc" }, { name: "asc" }], select: { id: true, name: true, major: true } }),
  ]);
  const majors = [...new Set(classes.map((c) => c.major))].sort();
  const qs = new URLSearchParams({ dari: f.from, sampai: f.to, ...(f.classId && { kelas: f.classId }), ...(f.major && { jurusan: f.major }), ...(f.grade && { tingkat: String(f.grade) }) }).toString();

  return (
    <>
      <PageHeader
        title="Laporan"
        description={f.label}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/api/laporan/excel?${qs}`}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/api/laporan/pdf?${qs}`} target="_blank" rel="noopener">
                <FileText /> PDF
              </a>
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap">
        <DateRangeFilter />
        <FilterSelect param="kelas" placeholder="Semua kelas" className="w-full lg:w-40" options={classes.map((c) => ({ value: c.id, label: c.name }))} />
        <FilterSelect param="jurusan" placeholder="Semua jurusan" className="w-full lg:w-40" options={majors.map((m) => ({ value: m, label: m }))} />
        <FilterSelect param="tingkat" placeholder="Semua tingkat" className="w-full lg:w-36" options={[10, 11, 12, 13].map((g) => ({ value: String(g), label: `Tingkat ${g}` }))} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Kejadian", r.totals.incidents],
          ["Pelanggaran", r.totals.violations],
          ["Total poin", r.totals.points],
          ["Siswa terlibat", r.totals.students],
          ["Prestasi", r.totals.achievements],
        ].map(([label, v]) => (
          <Card key={label as string}>
            <CardContent className="pt-4 md:pt-5">
              <p className="text-2xl font-bold tabular-nums">{v}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Per jenis pelanggaran</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {r.types.length > 0 && <SimpleBarChart horizontal ariaLabel="Pelanggaran per jenis" unit="kali" data={r.types.slice(0, 10).map((t) => ({ label: t.name, value: t.count, extra: `${t.points} poin` }))} />}
            <Table>
              <THead>
                <TR>
                  <TH>Jenis</TH>
                  <TH className="text-right">Jumlah</TH>
                  <TH className="text-right">Poin</TH>
                </TR>
              </THead>
              <TBody>
                {r.types.length === 0 && (
                  <TR>
                    <TD colSpan={3} className="text-center text-muted-foreground">
                      Tidak ada data pada periode ini.
                    </TD>
                  </TR>
                )}
                {r.types.map((t) => (
                  <TR key={t.name}>
                    <TD>
                      {t.name} <LevelBadge level={t.level as "RINGAN"} />
                    </TD>
                    <TD className="text-right tabular-nums">{t.count}</TD>
                    <TD className="text-right tabular-nums">{t.points}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Per kelas & jurusan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Table>
              <THead>
                <TR>
                  <TH>Kelas</TH>
                  <TH className="text-right">Siswa</TH>
                  <TH className="text-right">Pelanggaran</TH>
                  <TH className="text-right">Poin</TH>
                </TR>
              </THead>
              <TBody>
                {r.classes.map((c) => (
                  <TR key={c.name}>
                    <TD>{c.name}</TD>
                    <TD className="text-right tabular-nums">{c.students}</TD>
                    <TD className="text-right tabular-nums">{c.count}</TD>
                    <TD className="text-right tabular-nums">{c.points}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Table>
              <THead>
                <TR>
                  <TH>Jurusan</TH>
                  <TH className="text-right">Pelanggaran</TH>
                  <TH className="text-right">Poin</TH>
                </TR>
              </THead>
              <TBody>
                {r.majors.map((m) => (
                  <TR key={m.name}>
                    <TD>{m.name}</TD>
                    <TD className="text-right tabular-nums">{m.count}</TD>
                    <TD className="text-right tabular-nums">{m.points}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Per siswa</CardTitle>
            <CardDescription>Poin pada periode terpilih (bukan akumulasi tahun ajaran). {r.students.length > 100 && "Menampilkan 100 teratas — unduh Excel untuk data lengkap."}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-0">
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">#</TH>
                  <TH>Nama</TH>
                  <TH className="hidden sm:table-cell">NISN</TH>
                  <TH>Kelas</TH>
                  <TH className="text-right">Pelanggaran</TH>
                  <TH className="hidden sm:table-cell text-right">Berat</TH>
                  <TH className="text-right">Poin</TH>
                </TR>
              </THead>
              <TBody>
                {r.students.slice(0, 100).map((s, i) => (
                  <TR key={s.nisn}>
                    <TD className="text-muted-foreground">{i + 1}</TD>
                    <TD className="font-medium">{s.name}</TD>
                    <TD className="hidden sm:table-cell font-mono text-xs">{s.nisn}</TD>
                    <TD>{s.className}</TD>
                    <TD className="text-right tabular-nums">{s.count}</TD>
                    <TD className="hidden sm:table-cell text-right tabular-nums">{s.berat}</TD>
                    <TD className="text-right font-semibold tabular-nums">{s.points}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
