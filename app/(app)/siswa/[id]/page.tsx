import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CalendarDays, Phone, ShieldAlert, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { canViewStudent, requirePageRole } from "@/lib/rbac";
import { getActiveAcademicYear, getSettings } from "@/lib/settings";
import { COUNTED_INCIDENT, loadThresholds, studentPoints } from "@/lib/points-db";
import { currentThreshold, nextThreshold, statusColor } from "@/lib/points";
import { formatDate, formatShortDate, witaParts } from "@/lib/date";
import { displayPhone, maskPhone } from "@/lib/phone";
import { GENDER_LABEL, LETTER_TYPE_LABEL, RELATION_LABEL } from "@/lib/constants";
import { ACHIEVEMENT_LEVEL_LABEL } from "@/lib/validators/incident";
import { PageHeader } from "@/components/page-header";
import { CaseStatusBadge, IncidentStatusBadge, PointsBadge } from "@/components/status-badges";
import { LevelBadge } from "@/components/level-badge";
import { MonthlyPointsChart, type MonthPoint } from "@/components/charts/monthly-points-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AchievementDialog, DeleteAchievementButton } from "./client";

export const metadata = { title: "Profil Siswa" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole("ADMIN", "PKS", "WALI_KELAS", "BK", "KEPSEK");
  const { id } = await params;
  if (!(await canViewStudent(user, id))) notFound();

  const [student, year, thresholds, settings] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        class: { include: { waliKelas: { select: { name: true } } } },
        parents: { include: { parent: true }, orderBy: { isPrimary: "desc" } },
      },
    }),
    getActiveAcademicYear(),
    loadThresholds(),
    getSettings(),
  ]);
  if (!student) notFound();

  const [total, incidents, achievements, cases, hits] = await Promise.all([
    year ? studentPoints(id, year.id) : Promise.resolve(0),
    prisma.incidentStudent.findMany({
      where: { studentId: id, incident: { deletedAt: null } },
      orderBy: { incident: { occurredAt: "desc" } },
      take: 100,
      include: { incident: { select: { id: true, occurredAt: true, location: true, status: true, academicYearId: true, academicYear: { select: { name: true } } } } },
    }),
    prisma.achievement.findMany({ where: { studentId: id, deletedAt: null }, orderBy: { date: "desc" }, include: { recordedBy: { select: { name: true } } } }),
    prisma.case.findMany({
      where: { studentId: id },
      orderBy: { openedAt: "desc" },
      include: { letters: { where: { deletedAt: null }, select: { id: true, letterNumber: true, type: true, status: true, meetingAt: true } } },
    }),
    year ? prisma.thresholdHit.findMany({ where: { studentId: id, academicYearId: year.id }, include: { threshold: true }, orderBy: { reachedAt: "asc" } }) : Promise.resolve([]),
  ]);

  // grafik: poin terverifikasi per bulan pada tahun ajaran aktif
  const now = new Date();
  const start = year?.startDate ?? new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const sp0 = witaParts(start);
  const np = witaParts(now);
  const months: MonthPoint[] = [];
  const key = (y: number, m: number) => `${y}-${m}`;
  const idx = new Map<string, number>();
  for (let y = sp0.year, m = sp0.month; (y < np.year || (y === np.year && m <= np.month)) && months.length < 12; m === 12 ? (y++, (m = 1)) : m++) {
    idx.set(key(y, m), months.length);
    months.push({ label: MONTHS[m - 1]!, fullLabel: `${MONTHS_FULL[m - 1]} ${y}`, points: 0, count: 0 });
  }
  for (const r of incidents) {
    if (r.incident.status !== COUNTED_INCIDENT.status || r.incident.academicYearId !== year?.id) continue;
    const p = witaParts(r.incident.occurredAt);
    const i = idx.get(key(p.year, p.month));
    if (i !== undefined) {
      months[i]!.points += r.points;
      months[i]!.count += 1;
    }
  }

  const color = statusColor(thresholds, total);
  const cur = currentThreshold(thresholds, total);
  const next = nextThreshold(thresholds, total);
  const progress = next ? Math.min(100, Math.round((total / next.minPoints) * 100)) : 100;
  const showFullPhone = user.role === "ADMIN";
  const canAddAchievement = ["ADMIN", "PKS", "BK", "WALI_KELAS"].includes(user.role);
  const activeIncidents = incidents.filter((r) => r.incident.academicYearId === year?.id);
  const verifiedCount = activeIncidents.filter((r) => r.incident.status === "TERVERIFIKASI").length;

  return (
    <>
      <PageHeader
        title={student.name}
        description={
          <>
            NISN {student.nisn}
            {student.nis ? ` · NIS ${student.nis}` : ""} · {student.class?.name ?? "Tanpa kelas"} · {GENDER_LABEL[student.gender]}
            {!student.isActive && " · Nonaktif"}
          </>
        }
        backHref="/siswa"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Poin */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardDescription>Total poin TA {year?.name ?? "-"}</CardDescription>
            <div className="flex items-end gap-3">
              <span
                className={cn(
                  "text-5xl font-bold tabular-nums leading-none",
                  color === "red" ? "text-destructive" : color === "amber" ? "text-amber-600 dark:text-warning" : "text-success",
                )}
              >
                {total}
              </span>
              <span className="pb-1 text-sm text-muted-foreground">{verifiedCount} kejadian terverifikasi</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {cur ? (
              <p>
                <span className="text-muted-foreground">Ambang saat ini: </span>≥ {cur.minPoints} — {cur.action}
              </p>
            ) : (
              <p className="text-muted-foreground">Belum mencapai ambang sanksi.</p>
            )}
            {next && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Menuju ambang {next.minPoints}</span>
                  <span>{next.minPoints - total} poin lagi</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", color === "red" ? "bg-destructive" : color === "amber" ? "bg-warning" : "bg-success")}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            {settings.achievementReducesPoints && <p className="text-xs text-muted-foreground">Poin prestasi mengurangi total poin pelanggaran.</p>}
            {hits.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {hits.map((h) => (
                  <Badge key={h.id} variant="outline" title={formatDate(h.reachedAt)}>
                    ≥{h.threshold.minPoints} tercapai {formatShortDate(h.reachedAt)}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grafik */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Poin per bulan</CardTitle>
            <CardDescription>Kejadian terverifikasi pada tahun ajaran aktif.</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyPointsChart data={months} />
          </CardContent>
        </Card>

        {/* Data siswa & ortu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-4" /> Data & Orang Tua
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              <span className="text-muted-foreground">Wali kelas: </span>
              {student.class?.waliKelas?.name ?? "-"}
            </p>
            {student.birthDate && (
              <p>
                <span className="text-muted-foreground">Tanggal lahir: </span>
                {formatDate(student.birthDate)}
              </p>
            )}
            {student.address && (
              <p>
                <span className="text-muted-foreground">Alamat: </span>
                {student.address}
              </p>
            )}
            <div className="flex flex-col gap-2 border-t pt-3">
              {student.parents.length === 0 && <p className="text-muted-foreground">Data orang tua belum diisi.</p>}
              {student.parents.map(({ parent: p }) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{RELATION_LABEL[p.relation]}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="size-3" /> {showFullPhone ? displayPhone(p.waNumber) : maskPhone(p.waNumber)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Riwayat kejadian */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4" /> Riwayat kejadian
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-0">
            {incidents.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground md:px-5">Belum ada catatan kejadian.</p>
            ) : (
              <ul className="divide-y">
                {incidents.map((r) => (
                  <li key={r.id}>
                    <Link href={`/kejadian/${r.incident.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 md:px-5">
                      <div className="min-w-0">
                        <p className="font-medium">{r.violationName}</p>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3" /> {formatShortDate(r.incident.occurredAt)} · {r.incident.location}
                          {r.incident.academicYearId !== year?.id && <Badge variant="outline">TA {r.incident.academicYear.name}</Badge>}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="flex items-center gap-1.5">
                          <LevelBadge level={r.level} />
                          <span className={cn("font-semibold tabular-nums", r.incident.status !== "TERVERIFIKASI" && "text-muted-foreground line-through")}>
                            +{r.points}
                          </span>
                        </span>
                        {r.incident.status !== "TERVERIFIKASI" && <IncidentStatusBadge status={r.incident.status} />}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Prestasi */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4" /> Prestasi
            </CardTitle>
            {canAddAchievement && <AchievementDialog studentId={student.id} />}
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {achievements.length === 0 && <p className="text-muted-foreground">Belum ada prestasi tercatat.</p>}
            {achievements.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-2 rounded-md border p-2.5">
                <div className="min-w-0">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(a.date)} · {ACHIEVEMENT_LEVEL_LABEL[a.level as keyof typeof ACHIEVEMENT_LEVEL_LABEL] ?? a.level}
                    {a.points > 0 && ` · ${a.points} poin`}
                  </p>
                </div>
                {(user.role === "ADMIN" || user.role === "PKS" || a.recordedById === user.id) && <DeleteAchievementButton id={a.id} />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Kasus BK & surat */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Kasus BK & Surat</CardTitle>
            <CardDescription>Catatan konseling bersifat rahasia dan hanya dapat dibaca Guru BK.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {cases.length === 0 && <p className="text-muted-foreground">Tidak ada kasus BK.</p>}
            {cases.map((c) => (
              <div key={c.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{c.title}</p>
                  <div className="flex items-center gap-1.5">
                    {c.priority === "TINGGI" && <Badge variant="destructive">Prioritas tinggi</Badge>}
                    <CaseStatusBadge status={c.status} />
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dibuka {formatDate(c.openedAt)}
                  {c.needsLetter && c.letters.length === 0 && " · perlu surat panggilan"}
                  {c.needsApproval && !c.approvedAt && " · menunggu approval Kepsek"}
                </p>
                {c.letters.map((l) => (
                  <p key={l.id} className="mt-1 text-xs">
                    {LETTER_TYPE_LABEL[l.type]} · {l.letterNumber} · {formatShortDate(l.meetingAt)} · {l.status}
                  </p>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Warna poin: <PointsBadge points={0} color="green" /> aman · <PointsBadge points={25} color="amber" /> perlu perhatian ·{" "}
        <PointsBadge points={75} color="red" /> kritis
      </p>
    </>
  );
}
