import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

/** Cek apakah key sedang dikunci. Mengembalikan sisa menit kunci, atau 0 bila bebas. */
export async function lockedMinutes(key: string): Promise<number> {
  const row = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!row?.lockedUntil) return 0;
  const ms = row.lockedUntil.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

/** Catat kegagalan; kunci bila melewati batas dalam jendela waktu. */
export async function registerFailure(key: string, maxAttempts: number) {
  const now = new Date();
  const row = await prisma.loginAttempt.findUnique({ where: { key } });
  const inWindow = row && now.getTime() - row.windowStart.getTime() < WINDOW_MS;
  const count = inWindow ? row!.count + 1 : 1;
  await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, count, windowStart: now },
    update: {
      count,
      windowStart: inWindow ? row!.windowStart : now,
      lockedUntil: count >= maxAttempts ? new Date(now.getTime() + LOCK_MS) : null,
    },
  });
}

export async function clearFailures(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}
