"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { normalizeWa } from "@/lib/phone";
import { sendWa } from "@/lib/wa/adapter";
import { processWaQueue } from "@/lib/wa/queue";

/** Kirim ulang pesan yang gagal/pending: reset percobaan & jadwalkan segera. */
export async function resendWa(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const row = await prisma.waQueue.findUnique({ where: { id } });
    if (!row) throw new UserError("Pesan tidak ditemukan.");
    await prisma.waQueue.update({ where: { id }, data: { status: "PENDING", retryCount: 0, nextAttemptAt: new Date(), errorMessage: null } });
    await audit({ userId: me.id, action: "RESEND", entity: "WaQueue", entityId: id });
    revalidatePath("/pengaturan/wa");
    return { ok: true, message: "Pesan dijadwalkan ulang." };
  });
}

export async function processQueueNow(): Promise<ActionResult> {
  return runAction(async () => {
    await requireRole("ADMIN");
    const r = await processWaQueue(20);
    revalidatePath("/pengaturan/wa");
    if (r.skipped) return { ok: false, error: r.reason };
    return { ok: true, message: `Diproses: ${r.sent} terkirim, ${r.failed} gagal.` };
  });
}

const testSchema = z.object({
  to: z.string().refine((v) => normalizeWa(v) !== null, "Nomor WA tidak valid"),
  message: z.string().trim().min(1, "Pesan wajib diisi").max(1000),
});

/** Tes kirim langsung (tanpa antrean) dan catat hasilnya di log. */
export async function testSendWa(input: z.infer<typeof testSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = testSchema.parse(input);
    const to = normalizeWa(d.to)!;
    const res = await sendWa(to, d.message);
    await prisma.waQueue.create({
      data: {
        to,
        message: d.message,
        context: "TEST",
        status: res.ok ? "SENT" : "FAILED",
        sentAt: res.ok ? new Date() : null,
        retryCount: res.ok ? 0 : 1,
        maxRetry: 1,
        responseBody: res.body,
        errorMessage: res.ok ? null : `HTTP ${res.status}`,
      },
    });
    await audit({ userId: me.id, action: "TEST_WA", entity: "WaQueue", after: { to, ok: res.ok, status: res.status } });
    revalidatePath("/pengaturan/wa");
    return res.ok ? { ok: true, message: "Pesan tes terkirim." } : { ok: false, error: `Gagal mengirim (HTTP ${res.status}): ${res.body.slice(0, 200)}` };
  });
}
