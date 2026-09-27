"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action";
import { nn, thresholdSchema } from "@/lib/validators/master";

export async function saveThreshold(id: string | null, input: z.infer<typeof thresholdSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = thresholdSchema.parse(input);
    const data = { ...d, templateId: nn(d.templateId), notifyRoles: d.notifyRoles };
    const before = id ? await prisma.sanctionThreshold.findUnique({ where: { id } }) : null;
    const saved = id ? await prisma.sanctionThreshold.update({ where: { id }, data }) : await prisma.sanctionThreshold.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "SanctionThreshold", entityId: saved.id, before, after: saved });
    revalidatePath("/master/ambang-sanksi");
    return { ok: true, message: "Ambang sanksi disimpan." };
  });
}

export async function deleteThreshold(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const before = await prisma.sanctionThreshold.findUniqueOrThrow({ where: { id } });
    await prisma.sanctionThreshold.delete({ where: { id } });
    await audit({ userId: me.id, action: "DELETE", entity: "SanctionThreshold", entityId: id, before });
    revalidatePath("/master/ambang-sanksi");
    return { ok: true, message: "Ambang sanksi dihapus." };
  });
}
