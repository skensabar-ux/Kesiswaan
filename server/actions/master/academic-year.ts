"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { fromWitaInput } from "@/lib/date";
import { academicYearSchema } from "@/lib/validators/master";

type Input = z.infer<typeof academicYearSchema>;

function toData(d: Input) {
  return {
    name: d.name,
    semester: d.semester,
    startDate: d.startDate ? fromWitaInput(d.startDate) : null,
    endDate: d.endDate ? fromWitaInput(d.endDate) : null,
    isActive: d.isActive,
  };
}

export async function saveAcademicYear(id: string | null, input: Input): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const data = toData(academicYearSchema.parse(input));
    const before = id ? await prisma.academicYear.findUnique({ where: { id } }) : null;
    if (id && !before) throw new UserError("Tahun ajaran tidak ditemukan.");
    if (before?.isActive && !data.isActive) {
      throw new UserError("Tahun ajaran aktif tidak dapat dinonaktifkan langsung — aktifkan tahun ajaran lain.");
    }
    const saved = await prisma.$transaction(async (tx) => {
      if (data.isActive) await tx.academicYear.updateMany({ where: { NOT: { id: id ?? "" } }, data: { isActive: false } });
      return id ? tx.academicYear.update({ where: { id }, data }) : tx.academicYear.create({ data });
    });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "AcademicYear", entityId: saved.id, before, after: saved });
    revalidatePath("/master/tahun-ajaran");
    return { ok: true, message: "Tahun ajaran disimpan." };
  });
}

export async function deleteAcademicYear(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const before = await prisma.academicYear.findUniqueOrThrow({ where: { id } });
    if (before.isActive) throw new UserError("Tahun ajaran aktif tidak dapat dihapus.");
    await prisma.academicYear.delete({ where: { id } });
    await audit({ userId: me.id, action: "DELETE", entity: "AcademicYear", entityId: id, before });
    revalidatePath("/master/tahun-ajaran");
    return { ok: true, message: "Tahun ajaran dihapus." };
  });
}
