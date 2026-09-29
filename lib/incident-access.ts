import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { homeroomClassIds, parentStudentIds, type SessionUser } from "@/lib/rbac";

/** Role yang boleh melihat seluruh kejadian di sekolah. */
export const FULL_INCIDENT_ROLES = ["ADMIN", "PKS", "BK", "KEPSEK"] as const;

/**
 * Filter kejadian yang boleh dilihat user:
 * - ADMIN, PKS, BK, KEPSEK: semua
 * - GURU: hanya laporannya sendiri
 * - WALI_KELAS: laporannya sendiri + kejadian yang melibatkan siswa di kelasnya
 * - ORANG_TUA: kejadian terverifikasi yang melibatkan anaknya
 */
export async function incidentScope(user: SessionUser): Promise<Prisma.IncidentWhereInput> {
  switch (user.role) {
    case "ADMIN":
    case "PKS":
    case "BK":
    case "KEPSEK":
      return {};
    case "GURU":
      return { reporterId: user.id };
    case "WALI_KELAS": {
      const classIds = await homeroomClassIds(user.id);
      return { OR: [{ reporterId: user.id }, { students: { some: { student: { classId: { in: classIds } } } } }] };
    }
    case "ORANG_TUA":
      return { status: "TERVERIFIKASI", students: { some: { studentId: { in: await parentStudentIds(user.id) } } } };
  }
}

export async function findVisibleIncident<T extends Prisma.IncidentInclude>(user: SessionUser, id: string, include: T) {
  const scope = await incidentScope(user);
  return prisma.incident.findFirst({ where: { AND: [{ id, deletedAt: null }, scope] }, include });
}
