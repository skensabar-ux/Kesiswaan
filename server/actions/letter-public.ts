"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyUsers, userIdsByRoles } from "@/lib/notify";
import { formatLongDate } from "@/lib/date";
import { lockedMinutes, registerFailure } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/request";
import type { ActionResult } from "@/lib/action";

const schema = z.object({
  token: z.string().min(20).max(64),
  response: z.enum(["HADIR", "JADWAL_ULANG"]),
  reason: z.string().trim().max(500).optional(),
});

/**
 * Tanggapan orang tua dari tautan WA (tanpa login; token acak 32 karakter).
 * Hanya mengubah status konfirmasi — tidak membuka data lain.
 */
export async function respondToLetter(input: z.infer<typeof schema>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid." };
  const d = parsed.data;
  if (d.response === "JADWAL_ULANG" && (!d.reason || d.reason.length < 5)) return { ok: false, error: "Mohon tuliskan alasan dan usulan waktu (min. 5 karakter)." };

  const { ip } = await requestMeta();
  const key = `resp:${ip ?? "unknown"}`;
  if ((await lockedMinutes(key)) > 0) return { ok: false, error: "Terlalu banyak percobaan. Coba lagi nanti." };

  const l = await prisma.summonsLetter.findUnique({
    where: { responseToken: d.token },
    include: { case: { select: { id: true, assignedBkId: true, student: { select: { name: true } } } } },
  });
  if (!l || l.deletedAt || l.status === "DRAFT") {
    await registerFailure(key, 20);
    return { ok: false, error: "Tautan tidak valid atau surat telah dibatalkan." };
  }
  if (!["TERKIRIM", "DIKONFIRMASI", "JADWAL_ULANG"].includes(l.status)) return { ok: false, error: "Pertemuan ini sudah tercatat oleh sekolah." };
  if (l.meetingAt.getTime() < Date.now()) return { ok: false, error: "Jadwal pertemuan sudah lewat. Silakan hubungi Guru BK." };

  await prisma.$transaction(async (tx) => {
    await tx.summonsLetter.update({
      where: { id: l.id },
      data: {
        status: d.response === "HADIR" ? "DIKONFIRMASI" : "JADWAL_ULANG",
        parentResponse: d.response,
        parentResponseAt: new Date(),
        rescheduleReason: d.response === "JADWAL_ULANG" ? d.reason : null,
      },
    });
    const targets = l.case.assignedBkId ? [l.case.assignedBkId, l.createdById] : [...(await userIdsByRoles(tx, ["BK"])), l.createdById];
    await notifyUsers(tx, targets, {
      title: d.response === "HADIR" ? `Orang tua ${l.case.student.name} konfirmasi hadir` : `Orang tua ${l.case.student.name} minta jadwal ulang`,
      body: d.response === "HADIR" ? `Pertemuan ${formatLongDate(l.meetingAt)}.` : `Alasan: ${d.reason}`,
      link: `/bk/surat/${l.id}`,
    });
    await tx.auditLog.create({ data: { action: "PARENT_RESPONSE", entity: "SummonsLetter", entityId: l.id, after: { response: d.response, reason: d.reason ?? null }, ip } });
  });
  return {
    ok: true,
    message: d.response === "HADIR" ? "Terima kasih. Konfirmasi kehadiran telah kami terima." : "Permintaan jadwal ulang terkirim. Guru BK akan menghubungi Bapak/Ibu.",
  };
}
