import "server-only";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/roles";

export type SessionUser = { id: string; name: string; role: AppRole; username: string };

export class ForbiddenError extends Error {
  constructor(message = "Anda tidak memiliki akses untuk tindakan ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id) return null;
  return { id: u.id, name: u.name ?? "", role: u.role, username: u.username };
}

/** Untuk server action / route handler: lempar ForbiddenError bila tidak berhak. */
export async function requireRole(...roles: AppRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ForbiddenError("Sesi berakhir, silakan login kembali.");
  if (roles.length && !roles.includes(user.role)) throw new ForbiddenError();
  // pastikan akun masih aktif
  const active = await prisma.user.findUnique({ where: { id: user.id }, select: { isActive: true } });
  if (!active?.isActive) throw new ForbiddenError("Akun Anda dinonaktifkan.");
  return user;
}

/** Untuk server component (halaman): redirect bila tidak berhak. */
export async function requirePageRole(...roles: AppRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role)) redirect(user.role === "ORANG_TUA" ? "/ortu" : "/");
  return user;
}

/** ID kelas yang diampu wali kelas (tahun ajaran aktif & sebelumnya). */
export async function homeroomClassIds(userId: string): Promise<string[]> {
  const classes = await prisma.class.findMany({
    where: { waliKelas: { userId } },
    select: { id: true },
  });
  return classes.map((c) => c.id);
}

/** ID siswa yang menjadi anak dari akun orang tua. */
export async function parentStudentIds(userId: string): Promise<string[]> {
  const rows = await prisma.studentParent.findMany({
    where: { parent: { userId } },
    select: { studentId: true },
  });
  return rows.map((r) => r.studentId);
}

/**
 * Filter Prisma untuk siswa yang boleh dilihat user.
 * - WALI_KELAS: hanya siswa di kelas yang diampu
 * - ORANG_TUA: hanya anaknya sendiri
 * - GURU: boleh mencari siswa (untuk melapor) — data sensitif dibatasi di halaman masing-masing
 * - lainnya: semua siswa
 */
export async function studentScope(user: SessionUser): Promise<Prisma.StudentWhereInput> {
  if (user.role === "WALI_KELAS") return { classId: { in: await homeroomClassIds(user.id) } };
  if (user.role === "ORANG_TUA") return { id: { in: await parentStudentIds(user.id) } };
  return {};
}

export async function canViewStudent(user: SessionUser, studentId: string) {
  const scope = await studentScope(user);
  const found = await prisma.student.findFirst({ where: { AND: [{ id: studentId }, scope] }, select: { id: true } });
  return Boolean(found);
}
