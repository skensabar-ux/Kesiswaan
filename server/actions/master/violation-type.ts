"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { nn, violationTypeSchema } from "@/lib/validators/master";

export async function saveViolationType(id: string | null, input: z.infer<typeof violationTypeSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = violationTypeSchema.parse(input);
    const data = { code: d.code.toUpperCase(), name: d.name, categoryId: d.categoryId, points: d.points, description: nn(d.description), isActive: d.isActive };
    const before = id ? await prisma.violationType.findUnique({ where: { id } }) : null;
    const saved = id ? await prisma.violationType.update({ where: { id }, data }) : await prisma.violationType.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "ViolationType", entityId: saved.id, before, after: saved });
    revalidatePath("/master/jenis-pelanggaran");
    return { ok: true, message: "Jenis pelanggaran disimpan." };
  });
}

export async function deleteViolationType(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const before = await prisma.violationType.findUniqueOrThrow({ where: { id }, include: { _count: { select: { incidentStudents: true } } } });
    if (before._count.incidentStudents > 0) throw new UserError("Jenis pelanggaran sudah dipakai di riwayat kejadian — nonaktifkan saja.");
    await prisma.violationType.delete({ where: { id } });
    await audit({ userId: me.id, action: "DELETE", entity: "ViolationType", entityId: id, before });
    revalidatePath("/master/jenis-pelanggaran");
    return { ok: true, message: "Jenis pelanggaran dihapus." };
  });
}
