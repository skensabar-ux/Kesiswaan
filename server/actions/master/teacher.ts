"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { normalizeWa } from "@/lib/phone";
import { nn, teacherSchema } from "@/lib/validators/master";

export async function saveTeacher(id: string | null, input: z.infer<typeof teacherSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = teacherSchema.parse(input);
    const data = { nip: nn(d.nip), name: d.name, phone: normalizeWa(d.phone), isActive: d.isActive };
    const before = id ? await prisma.teacher.findUnique({ where: { id } }) : null;
    const saved = id ? await prisma.teacher.update({ where: { id }, data }) : await prisma.teacher.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Teacher", entityId: saved.id, before, after: saved });
    revalidatePath("/master/guru");
    return { ok: true, message: "Data guru disimpan." };
  });
}

export async function deleteTeacher(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const before = await prisma.teacher.findUniqueOrThrow({ where: { id }, include: { _count: { select: { homeroomClasses: true } } } });
    if (before._count.homeroomClasses > 0) throw new UserError("Guru masih menjadi wali kelas. Ganti wali kelas terlebih dahulu.");
    if (before.userId) throw new UserError("Guru memiliki akun login. Nonaktifkan saja, atau hapus tautan akunnya dulu.");
    await prisma.teacher.delete({ where: { id } });
    await audit({ userId: me.id, action: "DELETE", entity: "Teacher", entityId: id, before });
    revalidatePath("/master/guru");
    return { ok: true, message: "Data guru dihapus." };
  });
}
