import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COUNTED_INCIDENT } from "@/lib/points-db";
import { fromWitaInput, toDateInput, witaParts } from "@/lib/date";

export type ReportFilter = {
  from: string; // YYYY-MM-DD (WITA)
  to: string; // YYYY-MM-DD (WITA)
  classId?: string;
  major?: string;
  grade?: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Filter baris IncidentStudent: kejadian terverifikasi, tidak dihapus, dalam rentang, sesuai kelas (snapshot saat kejadian). */
export function rowWhere(f: ReportFilter): Prisma.IncidentStudentWhereInput {
  return {
    incident: { ...COUNTED_INCIDENT, occurredAt: { gte: fromWitaInput(f.from), lte: fromWitaInput(f.to, "23:59:59") } },
    ...(f.classId && { classId: f.classId }),
    ...((f.major || f.grade) && {
      student: { class: { ...(f.major && { major: f.major }), ...(f.grade && { grade: f.grade }) } },
    }),
  };
}

export type ReportData = Awaited<ReturnType<typeof buildReport>>;

/** Rekap untuk halaman laporan & export (Excel/PDF). */
export async function buildReport(f: ReportFilter) {
  const where = rowWhere(f);
  const [rows, achievements] = await Promise.all([
    prisma.incidentStudent.findMany({
      where,
      select: {
        points: true,
        violationName: true,
        level: true,
        className: true,
        studentId: true,
        student: { select: { name: true, nisn: true, class: { select: { name: true, major: true } } } },
        incident: { select: { id: true, occurredAt: true } },
      },
    }),
    prisma.achievement.count({
      where: {
        deletedAt: null,
        date: { gte: fromWitaInput(f.from), lte: fromWitaInput(f.to, "23:59:59") },
        ...(f.classId && { student: { classId: f.classId } }),
      },
    }),
  ]);

  const byStudent = new Map<string, { name: string; nisn: string; className: string; count: number; points: number; berat: number }>();
  const byType = new Map<string, { name: string; level: string; count: number; points: number }>();
  const byClass = new Map<string, { name: string; count: number; points: number; students: Set<string> }>();
  const byMajor = new Map<string, { name: string; count: number; points: number }>();
  const incidents = new Set<string>();
  for (const r of rows) {
    incidents.add(r.incident.id);
    const cls = r.className ?? r.student.class?.name ?? "-";
    const s = byStudent.get(r.studentId) ?? { name: r.student.name, nisn: r.student.nisn, className: cls, count: 0, points: 0, berat: 0 };
    s.count++;
    s.points += r.points;
    if (r.level === "BERAT") s.berat++;
    byStudent.set(r.studentId, s);
    const t = byType.get(r.violationName) ?? { name: r.violationName, level: r.level, count: 0, points: 0 };
    t.count++;
    t.points += r.points;
    byType.set(r.violationName, t);
    const c = byClass.get(cls) ?? { name: cls, count: 0, points: 0, students: new Set<string>() };
    c.count++;
    c.points += r.points;
    c.students.add(r.studentId);
    byClass.set(cls, c);
    const major = r.student.class?.major ?? "-";
    const m = byMajor.get(major) ?? { name: major, count: 0, points: 0 };
    m.count++;
    m.points += r.points;
    byMajor.set(major, m);
  }
  const sortDesc = <T extends { points: number; count: number }>(a: T, b: T) => b.points - a.points || b.count - a.count;
  return {
    filter: f,
    totals: { incidents: incidents.size, violations: rows.length, points: rows.reduce((a, r) => a + r.points, 0), students: byStudent.size, achievements },
    students: [...byStudent.values()].sort(sortDesc),
    types: [...byType.values()].sort((a, b) => b.count - a.count || b.points - a.points),
    classes: [...byClass.values()].map(({ students, ...c }) => ({ ...c, students: students.size })).sort(sortDesc),
    majors: [...byMajor.values()].sort(sortDesc),
  };
}

/** Jumlah pelanggaran terverifikasi per bulan (12 bulan terakhir, WITA). */
export async function monthlyTrend(months = 12, extra: Prisma.IncidentStudentWhereInput = {}) {
  const now = witaParts(new Date());
  const startMonth = new Date(Date.UTC(now.year, now.month - 1 - (months - 1), 1));
  const from = fromWitaInput(`${startMonth.getUTCFullYear()}-${String(startMonth.getUTCMonth() + 1).padStart(2, "0")}-01`);
  const rows = await prisma.incidentStudent.findMany({
    where: { ...extra, incident: { ...COUNTED_INCIDENT, occurredAt: { gte: from } } },
    select: { points: true, incident: { select: { occurredAt: true } } },
  });
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1));
    return { key: `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`, label: MONTHS[d.getUTCMonth()]!, fullLabel: `${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`, count: 0, points: 0 };
  });
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const r of rows) {
    const p = witaParts(r.incident.occurredAt);
    const i = idx.get(`${p.year}-${p.month}`);
    if (i !== undefined) {
      buckets[i]!.count++;
      buckets[i]!.points += r.points;
    }
  }
  return buckets;
}

/** Rentang default laporan: awal tahun ajaran aktif (atau 1 Juli) s.d. hari ini. */
export function defaultRange(yearStart: Date | null | undefined) {
  const today = toDateInput(new Date());
  const p = witaParts(new Date());
  const from = yearStart ? toDateInput(yearStart) : `${p.month >= 7 ? p.year : p.year - 1}-07-01`;
  return { from, to: today };
}
