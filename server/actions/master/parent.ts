"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { normalizeWa } from "@/lib/phone";
import { randomPin } from "@/lib/secrets";
import { nn, parentSchema } from "@/lib/validators/master";

export async function saveParent(id: string | null, input: z.infer<typeof parentSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = parentSchema.parse(input);
    const data = {
      name: d.name,
      relation: d.relation,
      waNumber: normalizeWa(d.waNumber),
      occupation: nn(d.occupation),
      address: nn(d.address),
    };
    const before = id ? await prisma.parent.findUnique({ where: { id }, include: { students: true } }) : null;
    const saved = await prisma.$transaction(async (tx) => {
      const p = id ? await tx.parent.update({ where: { id }, data }) : await tx.parent.create({ data });
      await tx.studentParent.deleteMany({ where: { parentId: p.id, studentId: { notIn: d.studentIds } } });
      for (const studentId of d.studentIds) {
        await tx.studentParent.upsert({
          where: { studentId_parentId: { studentId, parentId: p.id } },
          create: { studentId, parentId: p.id },
          update: {},
        });
      }
      if (p.userId) await tx.user.update({ where: { id: p.userId }, data: { name: p.name, phone: p.waNumber } });
      return p;
    });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Parent", entityId: saved.id, before, after: { ...saved, studentIds: d.studentIds } });
    revalidatePath("/master/ortu");
    return { ok: true, message: "Data orang tua disimpan." };
  });
}

export async function deleteParent(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const before = await prisma.parent.findUniqueOrThrow({ where: { id } });
    await prisma.$transaction(async (tx) => {
      await tx.parent.delete({ where: { id } });
      if (before.userId) await tx.user.update({ where: { id: before.userId }, data: { isActive: false } });
    });
    await audit({ userId: me.id, action: "DELETE", entity: "Parent", entityId: id, before });
    revalidatePath("/master/ortu");
    return { ok: true, message: "Data orang tua dihapus." };
  });
}

/** Buat akun portal ortu (bila belum ada) & set PIN baru. PIN hanya ditampilkan sekali. */
export async function resetParentPin(id: string): Promise<ActionResult<{ pin: string }>> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const parent = await prisma.parent.findUniqueOrThrow({ where: { id }, include: { _count: { select: { students: true } } } });
    if (parent._count.students === 0) throw new UserError("Tautkan orang tua ke siswa terlebih dahulu.");
    const pin = randomPin(6);
    const passwordHash = await bcrypt.hash(pin, 10);
    await prisma.$transaction(async (tx) => {
      if (parent.userId) {
        await tx.user.update({ where: { id: parent.userId }, data: { passwordHash, isActive: true, mustChangePassword: false } });
      } else {
        const user = await tx.user.create({
          data: {
            name: parent.name,
            username: `ortu.${parent.id}`,
            passwordHash,
            role: "ORANG_TUA",
            phone: parent.waNumber,
          },
        });
        await tx.parent.update({ where: { id }, data: { userId: user.id } });
      }
    });
    await audit({ userId: me.id, action: "RESET_PIN", entity: "Parent", entityId: id });
    revalidatePath("/master/ortu");
    return { ok: true, message: "PIN baru dibuat.", data: { pin } };
  });
}
