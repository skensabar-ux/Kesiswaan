"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action";
import { fromWitaInput } from "@/lib/date";
import { nn, studentSchema } from "@/lib/validators/master";

export async function saveStudent(id: string | null, input: z.infer<typeof studentSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = studentSchema.parse(input);
    const data = {
      nisn: d.nisn,
      nis: nn(d.nis),
      name: d.name,
      gender: d.gender,
      birthDate: d.birthDate ? fromWitaInput(d.birthDate) : null,
      classId: nn(d.classId),
      address: nn(d.address),
      isActive: d.isActive,
    };
    const before = id ? await prisma.student.findUnique({ where: { id } }) : null;
    const saved = id ? await prisma.student.update({ where: { id }, data }) : await prisma.student.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Student", entityId: saved.id, before, after: saved });
    revalidatePath("/master/siswa");
    return { ok: true, message: "Data siswa disimpan." };
  });
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const before = await prisma.student.findUniqueOrThrow({ where: { id } });
    await prisma.student.delete({ where: { id } }); // gagal (P2003) bila sudah punya riwayat kejadian/kasus
    await audit({ userId: me.id, action: "DELETE", entity: "Student", entityId: id, before });
    revalidatePath("/master/siswa");
    return { ok: true, message: "Data siswa dihapus." };
  });
}
