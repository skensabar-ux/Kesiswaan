"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, studentScope } from "@/lib/rbac";
import { STAFF_ROLES } from "@/lib/roles";

export type StudentOption = { id: string; name: string; nisn: string; className: string | null };

/** Pencarian siswa (nama / NISN / kelas) sesuai cakupan akses pengguna. */
export async function searchStudents(q: string, opts?: { includeInactive?: boolean }): Promise<StudentOption[]> {
  const user = await requireRole(...STAFF_ROLES);
  const term = q.trim();
  if (term.length < 2) return [];
  const scope = await studentScope(user);
  const rows = await prisma.student.findMany({
    where: {
      AND: [
        scope,
        opts?.includeInactive && user.role === "ADMIN" ? {} : { isActive: true },
        { OR: [{ name: { contains: term } }, { nisn: { startsWith: term } }, { class: { name: { contains: term } } }] },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
    select: { id: true, name: true, nisn: true, class: { select: { name: true } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, nisn: r.nisn, className: r.class?.name ?? null }));
}
