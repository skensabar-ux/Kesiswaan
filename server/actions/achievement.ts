"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canViewStudent, requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { fromWitaInput } from "@/lib/date";
import { getActiveAcademicYear } from "@/lib/settings";
import { achievementSchema, reasonSchema, type AchievementInput } from "@/lib/validators/incident";

const ROLES = ["ADMIN", "PKS", "BK", "WALI_KELAS"] as const;

export async function createAchievement(input: AchievementInput): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...ROLES);
    const d = achievementSchema.parse(input);
    if (!(await canViewStudent(me, d.studentId))) throw new UserError("Anda tidak berhak mencatat prestasi siswa ini.");
    const year = await getActiveAcademicYear();
    if (!year) throw new UserError("Belum ada tahun ajaran aktif.");
    const row = await prisma.achievement.create({
      data: {
        studentId: d.studentId,
        date: fromWitaInput(d.date),
        title: d.title,
        level: d.level,
        points: d.points,
        description: d.description || null,
        recordedById: me.id,
        academicYearId: year.id,
      },
    });
    await audit({ userId: me.id, action: "CREATE", entity: "Achievement", entityId: row.id, after: row });
    revalidatePath(`/siswa/${d.studentId}`);
    return { ok: true, message: "Prestasi dicatat." };
  });
}

export async function deleteAchievement(id: string, reason?: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...ROLES);
    const why = reasonSchema.parse(reason ?? "");
    const row = await prisma.achievement.findUnique({ where: { id } });
    if (!row || row.deletedAt) throw new UserError("Data tidak ditemukan.");
    if (!(me.role === "ADMIN" || me.role === "PKS" || row.recordedById === me.id)) throw new UserError("Anda tidak berhak menghapus data ini.");
    await prisma.achievement.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ userId: me.id, action: "DELETE", entity: "Achievement", entityId: id, before: row, after: { reason: why } });
    revalidatePath(`/siswa/${row.studentId}`);
    return { ok: true, message: "Prestasi dihapus." };
  });
}
