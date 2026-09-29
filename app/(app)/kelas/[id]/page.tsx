import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { homeroomClassIds, requirePageRole } from "@/lib/rbac";
import { loadThresholds, pointsForStudents } from "@/lib/points-db";
import { statusColor } from "@/lib/points";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PointsBadge } from "@/components/status-badges";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Rekap Kelas" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole("ADMIN", "PKS", "WALI_KELAS", "BK", "KEPSEK");
  const { id } = await params;
  if (user.role === "WALI_KELAS" && !(await homeroomClassIds(user.id)).includes(id)) notFound();
  const cls = await prisma.class.findUnique({
    where: { id },
    include: { waliKelas: { select: { name: true } }, academicYear: true, students: { where: { isActive: true }, orderBy: { name: "asc" } } },
  });
  if (!cls) notFound();

  const [points, thresholds, incidentCount] = await Promise.all([
    pointsForStudents(cls.students.map((s) => s.id), cls.academicYearId),
    loadThresholds(),
    prisma.incidentStudent.groupBy({
      by: ["studentId"],
      where: { studentId: { in: cls.students.map((s) => s.id) }, incident: { status: "TERVERIFIKASI", deletedAt: null, academicYearId: cls.academicYearId } },
      _count: true,
    }),
  ]);
  const counts = new Map(incidentCount.map((r) => [r.studentId, r._count]));
  const rows = cls.students
    .map((s) => {
      const p = points.get(s.id) ?? 0;
      return { ...s, points: p, color: statusColor(thresholds, p), incidents: counts.get(s.id) ?? 0 };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const tally = { green: 0, amber: 0, red: 0 };
  for (const r of rows) tally[r.color]++;

  return (
    <>
      <PageHeader
        title={`Kelas ${cls.name}`}
        description={`Wali kelas: ${cls.waliKelas?.name ?? "-"} · TA ${cls.academicYear.name} · ${rows.length} siswa`}
        backHref="/kelas"
      />
      <div className="mb-4 grid grid-cols-3 gap-3">
        {(
          [
            ["green", "Aman", "text-success"],
            ["amber", "Perlu perhatian", "text-amber-600 dark:text-warning"],
            ["red", "Kritis", "text-destructive"],
          ] as const
        ).map(([k, label, cls]) => (
          <Card key={k}>
            <CardContent className="pt-4 md:pt-5">
              <p className={`text-2xl font-bold tabular-nums ${cls}`}>{tally[k]}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Belum ada siswa di kelas ini" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="w-10">#</TH>
                <TH>Nama</TH>
                <TH className="hidden sm:table-cell">NISN</TH>
                <TH className="text-right">Kejadian</TH>
                <TH className="text-right">Poin</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r, i) => (
                <TR key={r.id}>
                  <TD className="text-muted-foreground">{i + 1}</TD>
                  <TD>
                    <Link href={`/siswa/${r.id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                  </TD>
                  <TD className="hidden sm:table-cell font-mono text-xs">{r.nisn}</TD>
                  <TD className="text-right tabular-nums">{r.incidents}</TD>
                  <TD className="text-right">
                    <PointsBadge points={r.points} color={r.color} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
