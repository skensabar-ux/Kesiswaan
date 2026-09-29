import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { normalizeWa } from "@/lib/phone";
import { sendWa } from "@/lib/wa/adapter";

type Tx = Prisma.TransactionClient;

/** Jeda percobaan ulang (menit) setelah gagal ke-1, ke-2, … */
export const RETRY_BACKOFF_MIN = [1, 5, 15, 60];

export function nextAttemptDelayMs(retryCount: number) {
  return (RETRY_BACKOFF_MIN[Math.min(retryCount, RETRY_BACKOFF_MIN.length) - 1] ?? 1) * 60_000;
}

export type EnqueueInput = { to: string | null | undefined; message: string; recipientName?: string | null; context: string; refId?: string | null };

/** Masukkan pesan ke antrean (tidak mengirim langsung). Nomor tidak valid diabaikan. */
export async function enqueueWa(tx: Tx, items: EnqueueInput[]) {
  const data = items
    .map((i) => ({ ...i, to: normalizeWa(i.to) }))
    .filter((i): i is EnqueueInput & { to: string } => Boolean(i.to))
    .map((i) => ({ to: i.to, message: i.message, recipientName: i.recipientName ?? null, context: i.context, refId: i.refId ?? null }));
  if (data.length) await tx.waQueue.createMany({ data });
  return data.length;
}

/**
 * Proses antrean secara bertahap (dipanggil cron cPanel tiap 1–5 menit).
 * Tiap pesan "diklaim" dulu (nextAttemptAt digeser) agar dua proses cron tidak mengirim pesan yang sama.
 */
export async function processWaQueue(limit = 20) {
  const settings = await getSettings();
  if (!settings.waEnabled) return { skipped: true as const, reason: "Pengiriman WA dinonaktifkan di Pengaturan.", sent: 0, failed: 0 };

  const now = new Date();
  const candidates = await prisma.waQueue.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let sent = 0;
  let failed = 0;
  for (const item of candidates) {
    const lease = new Date(Date.now() + 5 * 60_000);
    const claimed = await prisma.waQueue.updateMany({
      where: { id: item.id, status: "PENDING", nextAttemptAt: item.nextAttemptAt },
      data: { nextAttemptAt: lease },
    });
    if (claimed.count === 0) continue;

    const res = await sendWa(item.to, item.message);
    if (res.ok) {
      sent++;
      await prisma.waQueue.update({ where: { id: item.id }, data: { status: "SENT", sentAt: new Date(), responseBody: res.body, errorMessage: null } });
    } else {
      failed++;
      const retryCount = item.retryCount + 1;
      const giveUp = retryCount >= item.maxRetry;
      await prisma.waQueue.update({
        where: { id: item.id },
        data: {
          retryCount,
          status: giveUp ? "FAILED" : "PENDING",
          nextAttemptAt: new Date(Date.now() + nextAttemptDelayMs(retryCount)),
          responseBody: res.body,
          errorMessage: `HTTP ${res.status}`,
        },
      });
    }
  }
  return { skipped: false as const, sent, failed, checked: candidates.length };
}
