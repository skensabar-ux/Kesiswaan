import "server-only";
import { prisma } from "@/lib/prisma";
import { getActiveAcademicYear } from "@/lib/settings";
import { defaultRange, type ReportFilter } from "@/lib/report";
import { formatDate, fromWitaInput } from "@/lib/date";

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(p: Params, k: string) {
  const v = p instanceof URLSearchParams ? p.get(k) : p[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}
const isDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  try {
    fromWitaInput(s);
    return true;
  } catch {
    return false;
  }
};

/** Baca & validasi filter laporan dari query string (dipakai halaman & endpoint export). */
export async function parseReportFilter(p: Params): Promise<ReportFilter & { label: string }> {
  const year = await getActiveAcademicYear();
  const def = defaultRange(year?.startDate);
  let from = isDate(get(p, "dari")) ? get(p, "dari") : def.from;
  let to = isDate(get(p, "sampai")) ? get(p, "sampai") : def.to;
  if (from > to) [from, to] = [to, from];
  const classId = get(p, "kelas") || undefined;
  const major = get(p, "jurusan") || undefined;
  const grade = Number(get(p, "tingkat")) || undefined;
  const cls = classId ? await prisma.class.findUnique({ where: { id: classId }, select: { name: true } }) : null;
  const parts = [`${formatDate(fromWitaInput(from))} – ${formatDate(fromWitaInput(to))}`];
  if (cls) parts.push(`Kelas ${cls.name}`);
  if (major) parts.push(`Jurusan ${major}`);
  if (grade) parts.push(`Tingkat ${grade}`);
  return { from, to, classId: cls ? classId : undefined, major, grade, label: parts.join(" · ") };
}
