"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action";
import { getSettings } from "@/lib/settings";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { nn, settingsSchema } from "@/lib/validators/master";

export async function saveSettings(input: z.infer<typeof settingsSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = settingsSchema.parse(input);
    const before = await getSettings();
    const data = {
      ...d,
      npsn: nn(d.npsn),
      phone: nn(d.phone),
      email: nn(d.email),
      website: nn(d.website),
      governmentLine1: d.governmentLine1 ?? "",
      governmentLine2: d.governmentLine2 ?? "",
      principalName: d.principalName ?? "",
      principalNip: d.principalNip ?? "",
    };
    const after = await prisma.schoolSetting.update({ where: { id: 1 }, data });
    await audit({ userId: me.id, action: "UPDATE", entity: "SchoolSetting", entityId: "1", before, after });
    revalidatePath("/", "layout");
    return { ok: true, message: "Pengaturan disimpan." };
  });
}

export async function uploadLogo(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const file = formData.get("logo");
    if (!(file instanceof File)) return { ok: false, error: "Pilih file logo." };
    const before = await getSettings();
    const saved = await saveImage(file, "public/logo", 1024 * 1024);
    await prisma.schoolSetting.update({ where: { id: 1 }, data: { logoPath: saved.path } });
    await deleteUpload(before.logoPath);
    await audit({ userId: me.id, action: "UPDATE", entity: "SchoolSetting", entityId: "1", after: { logoPath: saved.path } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Logo diperbarui." };
  });
}
