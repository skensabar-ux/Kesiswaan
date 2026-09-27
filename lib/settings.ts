import "server-only";
import { prisma } from "@/lib/prisma";
import { DEFAULT_WA_VIOLATION_TEMPLATE } from "@/lib/constants";

/** Ambil setting sekolah (baris tunggal id=1); dibuat otomatis bila belum ada. */
export async function getSettings() {
  const s = await prisma.schoolSetting.findUnique({ where: { id: 1 } });
  if (s) return s;
  return prisma.schoolSetting.upsert({
    where: { id: 1 },
    create: { id: 1, waViolationTemplate: DEFAULT_WA_VIOLATION_TEMPLATE },
    update: {},
  });
}

export async function getActiveAcademicYear() {
  return prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { name: "desc" } });
}
