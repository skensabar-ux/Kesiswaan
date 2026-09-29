import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parentStudentIds, requirePageRole } from "@/lib/rbac";
import { getActiveAcademicYear } from "@/lib/settings";
import { loadThresholds, studentPoints } from "@/lib/points-db";
import { currentThreshold, statusColor } from "@/lib/points";
import { formatLongDate, formatShortDate, formatTime } from "@/lib/date";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { CaseStatusBadge, PointsBadge } from "@/components/status-badges";
import { LevelBadge } from "@/components/level-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Riwayat Anak" };

const LETTER_STATUS: Record<string, string> = {
  DRAFT: "Draf",
  TERKIRIM: "Menunggu konfirmasi",
  DIKONFIRMASI: "Dikonfirmasi hadir",
  JADWAL_ULANG: "Minta jadwal ulang",
  HADIR: "Hadir",
  TIDAK_HADIR: "Tidak hadir",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole("ORANG_TUA");
  const { id } = await params;
  if (!(await parentStudentIds(user.id)).includes(id)) notFound();
  const [student, year, thresholds] = await Promise.all([
    prisma.student.findUnique({ where: { id }, include: { class: { select: { name: true } } } }),
    getActiveAcademicYear(),
    loadThresholds(),
  ]);
  if (!student) notFound();
  const [total, incidents, achievements, cases] = await Promise.all([
    year ? studentPoints(id, year.id) : Promise.resolve(0),
    // hanya kejadian terverifikasi & tidak dihapus; kronologi tidak ditampilkan (bisa memuat nama siswa lain)
    prisma.incidentStudent.findMany({
      where: { studentId: id, incident: { status: "TERVERIFIKASI", deletedAt: null } },
      orderBy: { incident: { occurredAt: "desc" } },
      take: 100,
      select: { id: true, violationName: true, level: true, points: true, incident: { select: { occurredAt: true, location: true, academicYearId: true } } },
    }),
    prisma.achievement.findMany({ where: { studentId: id, deletedAt: null }, orderBy: { date: "desc" } }),
    prisma.case.findMany({
      where: { studentId: id },
      orderBy: { openedAt: "desc" },
      select: {
        id: true,
        status: true,
        openedAt: true,
        letters: { where: { deletedAt: null, status: { not: "DRAFT" } }, select: { id: true, type: true, status: true, meetingAt: true, place: true, responseToken: true } },
      },
    }),
  ]);
  const cur = currentThreshold(thresholds, total);
  const letters = cases.flatMap((c) => c.letters);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={student.name} description={`${student.class?.name ?? "-"} · NISN ${student.nisn}`} backHref="/ortu" />
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 pt-4 md:pt-5">
            <PointsBadge points={total} color={statusColor(thresholds, total)} className="px-4 py-2 text-2xl" />
            <div className="text-sm">
              <p className="font-medium">Total poin pelanggaran TA {year?.name ?? "-"}</p>
              <p className="text-muted-foreground">{cur ? `Tahap pembinaan: ${cur.action}` : "Belum mencapai batas pembinaan."}</p>
            </div>
          </CardContent>
        </Card>

        {letters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Surat dari sekolah</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {letters.map((l) => (
                <Link key={l.id} href={`/konfirmasi/${l.responseToken}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 hover:bg-muted/40">
                  <span>
                    <b>{LETTER_TYPE_LABEL[l.type]}</b>
                    <br />
                    <span className="text-muted-foreground">
                      {formatLongDate(l.meetingAt)} {formatTime(l.meetingAt)} WITA · {l.place}
                    </span>
                  </span>
                  <Badge variant={l.status === "TERKIRIM" ? "warning" : "secondary"}>{LETTER_STATUS[l.status]}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4" /> Catatan pelanggaran
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-0">
            {incidents.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground md:px-5">Tidak ada catatan pelanggaran. Terima kasih atas dukungan Bapak/Ibu.</p>
            ) : (
              <ul className="divide-y">
                {incidents.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                    <div>
                      <p className="font-medium">{r.violationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatShortDate(r.incident.occurredAt)} · {r.incident.location}
                        {r.incident.academicYearId !== year?.id && " · tahun ajaran lalu"}
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5">
                      <LevelBadge level={r.level} />
                      <b className="tabular-nums">+{r.points}</b>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4" /> Prestasi
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {achievements.length === 0 && <p className="text-muted-foreground">Belum ada prestasi tercatat.</p>}
            {achievements.map((a) => (
              <p key={a.id}>
                🏆 <b>{a.title}</b> <span className="text-muted-foreground">· {formatShortDate(a.date)}</span>
              </p>
            ))}
          </CardContent>
        </Card>

        {cases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pendampingan Bimbingan Konseling</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {cases.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                  <span>Dimulai {formatShortDate(c.openedAt)}</span>
                  <CaseStatusBadge status={c.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
