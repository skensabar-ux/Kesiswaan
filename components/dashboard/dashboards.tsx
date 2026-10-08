import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileClock,
  GraduationCap,
  HeartHandshake,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { CaseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/rbac";
import { homeroomClassIds } from "@/lib/rbac";
import { incidentScope } from "@/lib/incident-access";
import { getActiveAcademicYear } from "@/lib/settings";
import { COUNTED_INCIDENT, loadThresholds, pointsForStudents } from "@/lib/points-db";
import { statusColor } from "@/lib/points";
import { monthlyTrend } from "@/lib/report";
import { formatShortDate, formatTime, fromWitaInput, startOfWitaDay, toDateInput } from "@/lib/date";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { APPROVAL_REQUIRED } from "@/lib/letter";
import { SESSION_TYPE_LABEL } from "@/lib/validators/bk";
import { StatTile } from "@/components/stat-tile";
import { SimpleBarChart } from "@/components/charts/simple-bar-chart";
import { CaseStatusBadge, IncidentStatusBadge, PointsBadge } from "@/components/status-badges";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

const OPEN: CaseStatus[] = ["BARU", "DIJADWALKAN", "PROSES_PENDAMPINGAN", "MENUNGGU_EVALUASI"];

function weekStart() {
  const today = startOfWitaDay();
  const dow = (new Date(today.getTime() + 8 * 3600_000).getUTCDay() + 6) % 7; // 0 = Senin
  return new Date(today.getTime() - dow * 86_400_000);
}

async function incidentCounts(user: SessionUser) {
  const scope = await incidentScope(user);
  const base = { AND: [scope, { deletedAt: null, status: { not: "DITOLAK" as const } }] };
  const [today, week] = await Promise.all([
    prisma.incident.count({ where: { ...base, occurredAt: { gte: startOfWitaDay() } } }),
    prisma.incident.count({ where: { ...base, occurredAt: { gte: weekStart() } } }),
  ]);
  return { today, week };
}

async function topStudents(yearId: string, take = 10) {
  const grouped = await prisma.incidentStudent.groupBy({
    by: ["studentId"],
    where: { incident: { ...COUNTED_INCIDENT, academicYearId: yearId } },
    _sum: { points: true },
    _count: true,
    orderBy: { _sum: { points: "desc" } },
    take: take * 2,
  });
  const ids = grouped.map((g) => g.studentId);
  const [students, points] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, class: { select: { name: true } } } }),
    pointsForStudents(ids, yearId), // memperhitungkan kebijakan prestasi
  ]);
  const byId = new Map(students.map((s) => [s.id, s]));
  return grouped
    .map((g) => ({ id: g.studentId, name: byId.get(g.studentId)?.name ?? "-", className: byId.get(g.studentId)?.class?.name ?? "-", count: g._count, points: points.get(g.studentId) ?? 0 }))
    .sort((a, b) => b.points - a.points)
    .slice(0, take);
}

function TrendCard({ data }: { data: Awaited<ReturnType<typeof monthlyTrend>> }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Tren pelanggaran per bulan</CardTitle>
        <CardDescription>Jumlah pelanggaran terverifikasi, 12 bulan terakhir.</CardDescription>
      </CardHeader>
      <CardContent>
        <SimpleBarChart
          ariaLabel="Tren pelanggaran per bulan"
          unit="pelanggaran"
          data={data.map((d) => ({ label: d.label, fullLabel: d.fullLabel, value: d.count, extra: `${d.points} poin` }))}
        />
      </CardContent>
    </Card>
  );
}

// ───────────────────────── PKS & Admin ─────────────────────────
export async function PksDashboard({ user }: { user: SessionUser }) {
  const year = await getActiveAcademicYear();
  const yearId = year?.id ?? "";
  const thresholds = await loadThresholds();
  const [counts, pending, openCases, trend, top, typeRows, classRows, majorRows, students] = await Promise.all([
    incidentCounts(user),
    prisma.incident.count({ where: { status: "MENUNGGU_VERIFIKASI", deletedAt: null } }),
    prisma.case.count({ where: { status: { in: OPEN } } }),
    monthlyTrend(12),
    yearId ? topStudents(yearId) : Promise.resolve([]),
    prisma.incidentStudent.groupBy({ by: ["violationName"], where: { incident: { ...COUNTED_INCIDENT, academicYearId: yearId } }, _count: true, orderBy: { _count: { violationName: "desc" } }, take: 8 }),
    prisma.incidentStudent.groupBy({ by: ["className"], where: { incident: { ...COUNTED_INCIDENT, academicYearId: yearId } }, _count: true, _sum: { points: true }, orderBy: { _count: { className: "desc" } }, take: 10 }),
    prisma.$queryRaw<{ major: string; n: bigint }[]>`
      SELECT c.major AS major, COUNT(*) AS n
      FROM IncidentStudent s
      JOIN Incident i ON i.id = s.incidentId
      JOIN Class c ON c.id = s.classId
      WHERE i.status = 'TERVERIFIKASI' AND i.deletedAt IS NULL AND i.academicYearId = ${yearId}
      GROUP BY c.major ORDER BY n DESC`,
    user.role === "ADMIN" ? prisma.student.count({ where: { isActive: true } }) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile accent="blue" label="Kejadian hari ini" value={counts.today} icon={ClipboardList} href="/kejadian" />
        <StatTile accent="violet" label="Kejadian minggu ini" value={counts.week} icon={CalendarRange} href="/kejadian" />
        <StatTile accent="sky" label="Menunggu verifikasi" value={pending} icon={ClipboardCheck} href="/kejadian/verifikasi" tone={pending ? "warn" : undefined} />
        {students !== null ? (
          <StatTile accent="emerald" label="Siswa aktif" value={students} icon={GraduationCap} href="/master/siswa" />
        ) : (
          <StatTile accent="emerald" label="Kasus BK aktif" value={openCases} icon={HeartHandshake} href="/bk/kasus" />
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <TrendCard data={trend} />
        <Card>
          <CardHeader>
            <CardTitle>10 poin tertinggi</CardTitle>
            <CardDescription>TA {year?.name ?? "-"}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-0">
            {top.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground md:px-5">Belum ada data.</p>
            ) : (
              <ol className="divide-y">
                {top.map((s, i) => (
                  <li key={s.id}>
                    <Link href={`/siswa/${s.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/40 md:px-5">
                      <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.className} · {s.count} pelanggaran
                        </span>
                      </span>
                      <PointsBadge points={s.points} color={statusColor(thresholds, s.points)} />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pelanggaran terbanyak</CardTitle>
            <CardDescription>Per jenis, TA aktif</CardDescription>
          </CardHeader>
          <CardContent>
            {typeRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data.</p>
            ) : (
              <SimpleBarChart horizontal ariaLabel="Pelanggaran terbanyak per jenis" unit="kali" data={typeRows.map((r) => ({ label: r.violationName, value: r._count }))} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Per kelas</CardTitle>
            <CardDescription>10 kelas dengan pelanggaran terbanyak</CardDescription>
          </CardHeader>
          <CardContent>
            {classRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data.</p>
            ) : (
              <SimpleBarChart
                horizontal
                ariaLabel="Pelanggaran per kelas"
                unit="pelanggaran"
                data={classRows.map((r) => ({ label: r.className ?? "-", value: r._count, extra: `${r._sum.points ?? 0} poin` }))}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Per jurusan</CardTitle>
            <CardDescription>TA aktif</CardDescription>
          </CardHeader>
          <CardContent>
            {majorRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data.</p>
            ) : (
              <SimpleBarChart horizontal ariaLabel="Pelanggaran per jurusan" unit="pelanggaran" data={majorRows.map((r) => ({ label: r.major, value: Number(r.n) }))} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────── Wali kelas ─────────────────────────
export async function WalasDashboard({ user }: { user: SessionUser }) {
  const classIds = await homeroomClassIds(user.id);
  const [year, thresholds, classes, notifications, counts] = await Promise.all([
    getActiveAcademicYear(),
    loadThresholds(),
    prisma.class.findMany({
      where: { id: { in: classIds }, academicYear: { isActive: true } },
      include: { students: { where: { isActive: true }, select: { id: true, name: true } } },
    }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    incidentCounts(user),
  ]);
  const allStudents = classes.flatMap((c) => c.students.map((s) => ({ ...s, className: c.name })));
  const points = year ? await pointsForStudents(allStudents.map((s) => s.id), year.id) : new Map<string, number>();
  const rows = allStudents
    .map((s) => ({ ...s, points: points.get(s.id) ?? 0 }))
    .map((s) => ({ ...s, color: statusColor(thresholds, s.points) }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const tally = { green: 0, amber: 0, red: 0 };
  for (const r of rows) tally[r.color]++;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile accent="violet" label="Kejadian minggu ini" value={counts.week} icon={ClipboardList} href="/kejadian" />
        <StatTile accent="emerald" label="Siswa aman" value={tally.green} icon={ShieldCheck} />
        <StatTile accent="amber" label="Perlu perhatian" value={tally.amber} icon={AlertTriangle} tone={tally.amber ? "warn" : undefined} />
        <StatTile accent="rose" label="Kritis" value={tally.red} icon={ShieldAlert} tone={tally.red ? "bad" : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Siswa {classes.map((c) => c.name).join(", ") || "kelas Anda"}</CardTitle>
            <CardDescription>Urut poin tertinggi · TA {year?.name ?? "-"}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-0">
            {rows.length === 0 ? (
              <EmptyState title="Belum ada kelas" description="Akun Anda belum ditautkan sebagai wali kelas. Hubungi admin." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Nama</TH>
                    <TH className="text-right">Poin</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((r) => (
                    <TR key={r.id}>
                      <TD>
                        <Link href={`/siswa/${r.id}`} className="font-medium hover:underline">
                          {r.name}
                        </Link>
                      </TD>
                      <TD className="text-right">
                        <PointsBadge points={r.points} color={r.color} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notifikasi terbaru</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {notifications.length === 0 && <p className="text-muted-foreground">Belum ada notifikasi.</p>}
            {notifications.map((n) => (
              <Link key={n.id} href={n.link ?? "/notifikasi"} className="rounded-md border p-2.5 hover:bg-muted/40">
                <p className={n.isRead ? "" : "font-semibold"}>{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </Link>
            ))}
            <Link href="/notifikasi" className="text-xs text-primary hover:underline">
              Semua notifikasi →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────── BK ─────────────────────────
export async function BkDashboard({ user }: { user: SessionUser }) {
  const todayStart = startOfWitaDay();
  const tomorrow = new Date(todayStart.getTime() + 86_400_000);
  const [byStatus, lettersToday, sessionsToday, unconfirmed] = await Promise.all([
    prisma.case.groupBy({ by: ["status"], where: { status: { in: OPEN } }, _count: true }),
    prisma.summonsLetter.findMany({
      where: { deletedAt: null, status: { not: "DRAFT" }, meetingAt: { gte: todayStart, lt: tomorrow } },
      include: { case: { select: { student: { select: { name: true } } } } },
      orderBy: { meetingAt: "asc" },
    }),
    prisma.counselingSession.findMany({
      where: { status: "DIJADWALKAN", scheduledAt: { gte: todayStart, lt: tomorrow } },
      include: { case: { select: { id: true, student: { select: { name: true } } } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.summonsLetter.findMany({
      where: { deletedAt: null, status: { in: ["TERKIRIM", "JADWAL_ULANG"] }, meetingAt: { gte: new Date() } },
      include: { case: { select: { student: { select: { name: true } } } } },
      orderBy: { meetingAt: "asc" },
      take: 8,
    }),
  ]);
  const count = (s: CaseStatus) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const agenda = [
    ...lettersToday.map((l) => ({ at: l.meetingAt, title: l.case.student.name, sub: `${LETTER_TYPE_LABEL[l.type]} · ${l.place}`, href: `/bk/surat/${l.id}` })),
    ...sessionsToday.map((s) => ({ at: s.scheduledAt, title: s.case.student.name, sub: SESSION_TYPE_LABEL[s.type], href: `/bk/kasus/${s.case.id}` })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  void user;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile accent="blue" label="Kasus baru" value={count("BARU")} icon={HeartHandshake} href="/bk/kasus" tone={count("BARU") ? "warn" : undefined} />
        <StatTile accent="violet" label="Dijadwalkan" value={count("DIJADWALKAN")} icon={CalendarClock} href="/bk/kasus" />
        <StatTile accent="sky" label="Proses pendampingan" value={count("PROSES_PENDAMPINGAN")} icon={ShieldCheck} href="/bk/kasus" />
        <StatTile accent="emerald" label="Menunggu evaluasi" value={count("MENUNGGU_EVALUASI")} icon={ClipboardCheck} href="/bk/kasus" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jadwal hari ini</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {agenda.length === 0 && <p className="text-muted-foreground">Tidak ada jadwal hari ini.</p>}
            {agenda.map((a, i) => (
              <Link key={i} href={a.href} className="flex items-start gap-3 rounded-md border p-2.5 hover:bg-muted/40">
                <span className="w-12 shrink-0 font-semibold tabular-nums">{formatTime(a.at)}</span>
                <span>
                  <b>{a.title}</b>
                  <br />
                  <span className="text-xs text-muted-foreground">{a.sub}</span>
                </span>
              </Link>
            ))}
            <Link href="/bk/kalender" className="text-xs text-primary hover:underline">
              Buka kalender →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Surat belum dikonfirmasi orang tua</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {unconfirmed.length === 0 && <p className="text-muted-foreground">Semua surat sudah ditanggapi.</p>}
            {unconfirmed.map((l) => (
              <Link key={l.id} href={`/bk/surat/${l.id}`} className="flex items-center justify-between gap-2 rounded-md border p-2.5 hover:bg-muted/40">
                <span>
                  <b>{l.case.student.name}</b>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {LETTER_TYPE_LABEL[l.type]} · {formatShortDate(l.meetingAt)} {formatTime(l.meetingAt)}
                  </span>
                </span>
                <Badge variant="warning">{l.status === "JADWAL_ULANG" ? "Minta jadwal ulang" : "Belum konfirmasi"}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────── Kepala Sekolah ─────────────────────────
export async function KepsekDashboard({ user }: { user: SessionUser }) {
  const [counts, openCases, trend, highCases, pendingLetters, pendingCases, severe] = await Promise.all([
    incidentCounts(user),
    prisma.case.count({ where: { status: { in: OPEN } } }),
    monthlyTrend(12),
    prisma.case.findMany({
      where: { status: { in: OPEN }, priority: "TINGGI" },
      include: { student: { select: { name: true, class: { select: { name: true } } } } },
      orderBy: { openedAt: "desc" },
      take: 8,
    }),
    prisma.summonsLetter.findMany({
      where: { deletedAt: null, status: "DRAFT", approvedAt: null, type: { in: APPROVAL_REQUIRED } },
      include: { case: { select: { student: { select: { name: true } } } } },
    }),
    prisma.case.findMany({ where: { status: { in: OPEN }, needsApproval: true, approvedAt: null }, include: { student: { select: { name: true } } } }),
    prisma.incidentStudent.count({ where: { level: "BERAT", incident: { ...COUNTED_INCIDENT, occurredAt: { gte: fromWitaInput(toDateInput(new Date(Date.now() - 30 * 86_400_000))) } } } }),
  ]);
  const approvals = [
    ...pendingLetters.map((l) => ({ href: `/bk/surat/${l.id}`, title: `${LETTER_TYPE_LABEL[l.type]} — ${l.case.student.name}`, sub: l.letterNumber })),
    ...pendingCases.map((c) => ({ href: `/bk/kasus/${c.id}`, title: `Kasus — ${c.student.name}`, sub: c.title })),
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile accent="violet" label="Kejadian minggu ini" value={counts.week} icon={ClipboardList} href="/kejadian" />
        <StatTile accent="rose" label="Pelanggaran berat (30 hari)" value={severe} icon={ShieldAlert} tone={severe ? "bad" : undefined} />
        <StatTile accent="emerald" label="Kasus BK aktif" value={openCases} icon={HeartHandshake} href="/bk/kasus" />
        <StatTile accent="sky" label="Menunggu persetujuan" value={approvals.length} icon={FileClock} href="/bk/surat?filter=perlu-approval" tone={approvals.length ? "warn" : undefined} />
      </div>
      {approvals.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle>Perlu persetujuan Anda</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {approvals.map((a) => (
              <Link key={a.href} href={a.href} className="rounded-md border p-2.5 text-sm hover:bg-muted/40">
                <b>{a.title}</b>
                <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <TrendCard data={trend} />
        <Card>
          <CardHeader>
            <CardTitle>Kasus prioritas tinggi</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {highCases.length === 0 && <p className="text-muted-foreground">Tidak ada.</p>}
            {highCases.map((c) => (
              <Link key={c.id} href={`/bk/kasus/${c.id}`} className="rounded-md border p-2.5 hover:bg-muted/40">
                <div className="flex items-center justify-between gap-2">
                  <b>{c.student.name}</b>
                  <CaseStatusBadge status={c.status} />
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {c.student.class?.name ?? "-"} · {c.title}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────── Guru ─────────────────────────
export async function GuruDashboard({ user }: { user: SessionUser }) {
  const [counts, mine] = await Promise.all([
    incidentCounts(user),
    prisma.incident.findMany({
      where: { reporterId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { students: { select: { violationName: true, student: { select: { name: true } } } } },
    }),
  ]);
  const pending = mine.filter((m) => m.status === "MENUNGGU_VERIFIKASI").length;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile accent="blue" label="Laporan hari ini" value={counts.today} icon={ClipboardList} href="/kejadian" />
        <StatTile accent="violet" label="Laporan minggu ini" value={counts.week} icon={CalendarRange} href="/kejadian" />
        <StatTile accent="sky" label="Menunggu verifikasi" value={pending} icon={ClipboardCheck} href="/kejadian?status=MENUNGGU_VERIFIKASI" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Laporan terakhir saya</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {mine.length === 0 && <p className="text-muted-foreground">Belum ada laporan. Tekan “Catat Kejadian” untuk melapor.</p>}
          {mine.map((m) => (
            <Link key={m.id} href={`/kejadian/${m.id}`} className="flex items-center justify-between gap-2 rounded-md border p-2.5 hover:bg-muted/40">
              <span className="min-w-0">
                <b className="block truncate">{[...new Set(m.students.map((s) => s.violationName))].join(", ")}</b>
                <span className="block truncate text-xs text-muted-foreground">
                  {m.students.map((s) => s.student.name).join(", ")} · {formatShortDate(m.occurredAt)}
                </span>
              </span>
              <IncidentStatusBadge status={m.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
