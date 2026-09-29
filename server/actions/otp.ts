"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { lockedMinutes, registerFailure } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/request";
import { randomPin } from "@/lib/secrets";
import { ensureParentUser } from "@/lib/parent-account";
import { isWaConfigured, sendWa } from "@/lib/wa/adapter";
import type { ActionResult } from "@/lib/action";

const OTP_TTL_MIN = 5;
const GENERIC = "Bila NISN terdaftar dan nomor WA orang tua tersedia, kode OTP telah dikirim via WhatsApp. Kode berlaku 5 menit.";

/**
 * Kirim kode OTP login ke WA semua orang tua siswa (NISN). Tanpa login.
 * Balasan selalu sama agar tidak bisa dipakai menebak NISN yang terdaftar.
 */
export async function requestParentOtp(nisnRaw: string): Promise<ActionResult> {
  const nisn = String(nisnRaw ?? "").trim();
  if (!/^\d{10}$/.test(nisn)) return { ok: false, error: "NISN harus 10 digit angka." };
  const settings = await getSettings();
  if (!settings.parentOtpEnabled || !settings.waEnabled || !isWaConfigured()) {
    return { ok: false, error: "Login dengan OTP belum tersedia. Gunakan PIN dari sekolah." };
  }
  const { ip } = await requestMeta();
  const keys = [`otp:${nisn}`, `otpip:${ip ?? "unknown"}`];
  for (const k of keys) if ((await lockedMinutes(k)) > 0) return { ok: false, error: "Terlalu sering meminta kode. Coba lagi dalam 15 menit." };
  await registerFailure(keys[0]!, 3); // maks 3 permintaan / 15 menit per NISN
  await registerFailure(keys[1]!, 10); // maks 10 permintaan / 15 menit per IP

  const student = await prisma.student.findUnique({
    where: { nisn },
    select: { isActive: true, parents: { select: { parent: { select: { id: true, name: true, waNumber: true, userId: true } } } } },
  });
  const parents = student?.isActive ? student.parents.map((p) => p.parent).filter((p) => p.waNumber) : [];
  for (const parent of parents) {
    const code = randomPin(6);
    const userId = await prisma.$transaction((tx) => ensureParentUser(tx, parent));
    await prisma.otpCode.create({
      data: { userId, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000) },
    });
    const message = `Kode OTP Portal Orang Tua ${settings.schoolName}: ${code}\nBerlaku ${OTP_TTL_MIN} menit. Jangan berikan kode ini kepada siapa pun.`;
    // OTP dikirim langsung (tidak menunggu cron); hasil tetap dicatat di log WA
    const res = await sendWa(parent.waNumber!, message);
    await prisma.waQueue.create({
      data: {
        to: parent.waNumber!,
        recipientName: parent.name,
        context: "OTP",
        refId: parent.id,
        // kode tidak disimpan di log
        message: message.replace(code, "••••••"),
        status: res.ok ? "SENT" : "FAILED",
        sentAt: res.ok ? new Date() : null,
        retryCount: res.ok ? 0 : 1,
        maxRetry: 1,
        responseBody: res.body,
        errorMessage: res.ok ? null : `HTTP ${res.status}`,
      },
    });
  }
  return { ok: true, message: GENERIC };
}
