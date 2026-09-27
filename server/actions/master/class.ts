"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { classSchema, nn } from "@/lib/validators/master";

export async function saveClass(id: string | null, input: z.infer<typeof classSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = classSchema.parse(input);
    const data = { name: d.name, major: d.major.toUpperCase(), grade: d.grade, waliKelasId: nn(d.waliKelasId), academicYearId: d.academicYearId };
    const before = id ? await prisma.class.findUnique({ where: { id } }) : null;
    const saved = id ? await prisma.class.update({ where: { id }, data }) : await prisma.class.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Class", entityId: saved.id, before, after: saved });
    revalidatePath("/master/kelas");
    return { ok: true, message: "Kelas disimpan." };
  });
}

export async function deleteClass(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const before = await prisma.class.findUniqueOrThrow({ where: { id }, include: { _count: { select: { students: true } } } });
    if (before._count.students > 0) throw new UserError("Kelas masih memiliki siswa. Pindahkan siswa terlebih dahulu.");
    await prisma.class.delete({ where: { id } });
    await audit({ userId: me.id, action: "DELETE", entity: "Class", entityId: id, before });
    revalidatePath("/master/kelas");
    return { ok: true, message: "Kelas dihapus." };
  });
}
