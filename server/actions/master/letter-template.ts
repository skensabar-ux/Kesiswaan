"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { letterTemplateSchema } from "@/lib/validators/master";

export async function saveLetterTemplate(id: string | null, input: z.infer<typeof letterTemplateSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = letterTemplateSchema.parse(input);
    const data = { ...d, code: d.code.toUpperCase() };
    const before = id ? await prisma.letterTemplate.findUnique({ where: { id } }) : null;
    const saved = id ? await prisma.letterTemplate.update({ where: { id }, data }) : await prisma.letterTemplate.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "LetterTemplate", entityId: saved.id, before, after: saved });
    revalidatePath("/master/template-surat");
    return { ok: true, message: "Template surat disimpan." };
  });
}

export async function deleteLetterTemplate(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const before = await prisma.letterTemplate.findUniqueOrThrow({ where: { id }, include: { _count: { select: { letters: true } } } });
    if (before._count.letters > 0) throw new UserError("Template sudah dipakai untuk surat — nonaktifkan saja.");
    await prisma.letterTemplate.delete({ where: { id } });
    await audit({ userId: me.id, action: "DELETE", entity: "LetterTemplate", entityId: id, before });
    revalidatePath("/master/template-surat");
    return { ok: true, message: "Template surat dihapus." };
  });
}
