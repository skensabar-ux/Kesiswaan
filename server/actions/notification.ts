"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { runAction, type ActionResult } from "@/lib/action";

export async function markNotificationRead(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole();
    // updateMany + userId: user hanya bisa menandai notifikasinya sendiri
    await prisma.notification.updateMany({ where: { id, userId: me.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole();
    const r = await prisma.notification.updateMany({ where: { userId: me.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
    revalidatePath("/", "layout");
    return { ok: true, message: `${r.count} notifikasi ditandai dibaca.` };
  });
}
