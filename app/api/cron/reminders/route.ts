import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCronRequest } from "@/lib/cron";
import { enqueueWa } from "@/lib/wa/queue";
import { notifyUsers } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { formatLongDate, formatTime, fromWitaInput, toDateInput } from "@/lib/date";
import { appUrl } from "@/lib/url";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { SESSION_TYPE_LABEL } from "@/lib/validators/bk";

export const dynamic = "force-dynamic";

/**
 * Pengingat H-1 (jalankan via Cron cPanel, mis. tiap jam atau sekali sehari pukul 07.00 WITA).
 * - WA ke orang tua untuk surat panggilan yang pertemuannya BESOK (WITA) & belum diingatkan
 * - notifikasi in-app ke Guru BK untuk sesi pendampingan besok
 * Aman dijalankan berulang: surat yang sudah diingatkan ditandai reminderSentAt.
 */
async function handler(req: Request) {
  if (!isValidCronRequest(req)) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  const today = toDateInput(new Date());
  const tomorrowStart = new Date(fromWitaInput(today).getTime() + 86_400_000);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 86_400_000);
  const settings = await getSettings();

  const letters = await prisma.summonsLetter.findMany({
    where: { deletedAt: null, status: { in: ["TERKIRIM", "DIKONFIRMASI"] }, reminderSentAt: null, meetingAt: { gte: tomorrowStart, lt: tomorrowEnd } },
    include: { case: { include: { student: { include: { parents: { include: { parent: true } } } } } } },
  });
  let waCount = 0;
  for (const l of letters) {
    await prisma.$transaction(async (tx) => {
      // tandai dulu (updateMany + kondisi) agar dua cron bersamaan tidak mengirim dobel
      const claimed = await tx.summonsLetter.updateMany({ where: { id: l.id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
      if (claimed.count === 0) return;
      waCount += await enqueueWa(
        tx,
        l.case.student.parents
          .map((p) => p.parent)
          .map((p) => ({
            to: p.waNumber,
            recipientName: p.name,
            context: "REMINDER",
            refId: l.id,
            message: `Pengingat: Yth. Bapak/Ibu ${p.name}, besok ${formatLongDate(l.meetingAt)} pukul ${formatTime(l.meetingAt)} WITA Bapak/Ibu diundang ke ${settings.schoolName} (${l.place}) terkait ${LETTER_TYPE_LABEL[l.type]} ananda ${l.case.student.name}.\n${appUrl(`/konfirmasi/${l.responseToken}`)}`,
          })),
      );
    });
  }

  const sessions = await prisma.counselingSession.findMany({
    where: { status: "DIJADWALKAN", scheduledAt: { gte: tomorrowStart, lt: tomorrowEnd } },
    include: { case: { select: { id: true, student: { select: { name: true } } } } },
  });
  for (const s of sessions) {
    await prisma.$transaction((tx) =>
      notifyUsers(tx, [s.counselorId], {
        title: `Besok: ${SESSION_TYPE_LABEL[s.type]} — ${s.case.student.name}`,
        body: `${formatLongDate(s.scheduledAt)} pukul ${formatTime(s.scheduledAt)} WITA${s.place ? ` · ${s.place}` : ""}`,
        link: `/bk/kasus/${s.case.id}`,
      }),
    );
  }
  return NextResponse.json({ ok: true, letters: letters.length, waQueued: waCount, sessions: sessions.length, at: new Date().toISOString() });
}

export const GET = handler;
export const POST = handler;
