"use server";

import { revalidatePath } from "next/cache";
import type { CaseStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { fromWitaInput, formatLongDate, formatTime } from "@/lib/date";
import { getActiveAcademicYear, getSettings } from "@/lib/settings";
import { randomToken } from "@/lib/secrets";
import { appUrl } from "@/lib/url";
import { enqueueWa } from "@/lib/wa/queue";
import { notifyUsers, userIdsByRoles } from "@/lib/notify";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { counterScope, ensureLetterCounter, nextLetterNumber, withTxRetry } from "@/lib/letter-number";
import { APPROVAL_REQUIRED, renderLetterBody } from "@/lib/letter";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { reasonSchema } from "@/lib/validators/incident";
import {
  letterSchema,
  manualCaseSchema,
  rescheduleSchema,
  sessionRecordSchema,
  sessionScheduleSchema,
  type LetterInput,
  type SessionRecordInput,
  type SessionScheduleInput,
} from "@/lib/validators/bk";

const MANAGE = ["ADMIN", "BK"] as const;
const OPEN_STATUSES: CaseStatus[] = ["BARU", "DIJADWALKAN", "PROSES_PENDAMPINGAN", "MENUNGGU_EVALUASI"];

function revalidateCase(caseId: string) {
  revalidatePath(`/bk/kasus/${caseId}`);
  revalidatePath("/bk/kasus");
  revalidatePath("/bk/surat");
  revalidatePath("/bk/kalender");
}

async function loadOpenCase(caseId: string) {
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) throw new UserError("Kasus tidak ditemukan.");
  if (!OPEN_STATUSES.includes(c.status)) throw new UserError("Kasus sudah ditutup.");
  return c;
}

// ───────────────────────── Kasus ─────────────────────────

/** Buat kasus manual (eskalasi PKS ke BK, atau temuan BK sendiri). */
export async function createManualCase(input: z.infer<typeof manualCaseSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction<{ id: string }>(async () => {
    const me = await requireRole("ADMIN", "BK", "PKS");
    const d = manualCaseSchema.parse(input);
    const year = await getActiveAcademicYear();
    if (!year) throw new UserError("Belum ada tahun ajaran aktif.");
    const student = await prisma.student.findUnique({ where: { id: d.studentId }, select: { name: true } });
    if (!student) throw new UserError("Siswa tidak ditemukan.");
    const c = await prisma.$transaction(async (tx) => {
      const c = await tx.case.create({
        data: { studentId: d.studentId, academicYearId: year.id, title: d.title, priority: d.priority, createdById: me.id, assignedBkId: me.role === "BK" ? me.id : null },
      });
      if (me.role !== "BK") {
        await notifyUsers(tx, await userIdsByRoles(tx, ["BK"]), { title: `Kasus BK baru: ${student.name}`, body: `${d.title} (dieskalasi oleh ${me.name})`, link: `/bk/kasus/${c.id}` });
      }
      return c;
    });
    await audit({ userId: me.id, action: "CREATE", entity: "Case", entityId: c.id, after: c });
    revalidatePath("/bk/kasus");
    return { ok: true, message: "Kasus dibuat.", data: { id: c.id } };
  });
}

export async function assignCaseToMe(caseId: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("BK");
    await loadOpenCase(caseId);
    await prisma.case.update({ where: { id: caseId }, data: { assignedBkId: me.id } });
    await audit({ userId: me.id, action: "ASSIGN", entity: "Case", entityId: caseId });
    revalidateCase(caseId);
    return { ok: true, message: "Kasus ditangani oleh Anda." };
  });
}

export async function setCaseStatus(caseId: string, status: CaseStatus): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...MANAGE);
    if (!["BARU", "DIJADWALKAN", "PROSES_PENDAMPINGAN", "MENUNGGU_EVALUASI"].includes(status)) {
      throw new UserError("Gunakan tombol Tutup kasus / Rujuk untuk menyelesaikan kasus.");
    }
    const before = await loadOpenCase(caseId);
    await prisma.case.update({ where: { id: caseId }, data: { status } });
    await audit({ userId: me.id, action: "UPDATE_STATUS", entity: "Case", entityId: caseId, before: { status: before.status }, after: { status } });
    revalidateCase(caseId);
    return { ok: true, message: "Status kasus diperbarui." };
  });
}

export async function closeCase(caseId: string, summary?: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...MANAGE);
    const evaluation = z.string().trim().min(20, "Ringkasan evaluasi minimal 20 karakter").max(5000).parse(summary ?? "");
    const before = await loadOpenCase(caseId);
    if (before.needsApproval && !before.approvedAt) throw new UserError("Kasus ini menunggu persetujuan Kepala Sekolah.");
    await prisma.case.update({ where: { id: caseId }, data: { status: "SELESAI", closedAt: new Date(), evaluationSummary: evaluation } });
    await audit({ userId: me.id, action: "CLOSE", entity: "Case", entityId: caseId, before: { status: before.status }, after: { status: "SELESAI", evaluation } });
    revalidateCase(caseId);
    return { ok: true, message: "Kasus ditutup." };
  });
}

export async function referCase(caseId: string, referredTo?: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...MANAGE);
    const to = z.string().trim().min(3, "Isi pihak rujukan").max(191).parse(referredTo ?? "");
    const before = await loadOpenCase(caseId);
    await prisma.case.update({ where: { id: caseId }, data: { status: "DIRUJUK", referredTo: to, closedAt: new Date(), evaluationSummary: `Dirujuk ke ${to}` } });
    await audit({ userId: me.id, action: "REFER", entity: "Case", entityId: caseId, before: { status: before.status }, after: { status: "DIRUJUK", referredTo: to } });
    revalidateCase(caseId);
    return { ok: true, message: "Kasus dirujuk." };
  });
}

/** Persetujuan Kepala Sekolah (mis. ambang 150: rekomendasi dikembalikan ke orang tua). */
export async function approveCase(caseId: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("KEPSEK");
    const c = await loadOpenCase(caseId);
    if (!c.needsApproval) throw new UserError("Kasus ini tidak memerlukan persetujuan.");
    if (c.approvedAt) throw new UserError("Kasus sudah disetujui.");
    await prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: caseId }, data: { approvedById: me.id, approvedAt: new Date() } });
      await notifyUsers(tx, [c.assignedBkId ?? "", ...(await userIdsByRoles(tx, c.assignedBkId ? [] : ["BK"]))], {
        title: "Kasus disetujui Kepala Sekolah",
        body: c.title,
        link: `/bk/kasus/${caseId}`,
      });
    });
    await audit({ userId: me.id, action: "APPROVE", entity: "Case", entityId: caseId });
    revalidateCase(caseId);
    return { ok: true, message: "Kasus disetujui." };
  });
}

// ───────────────────────── Surat panggilan ─────────────────────────

export async function createLetter(input: LetterInput): Promise<ActionResult<{ id: string }>> {
  return runAction<{ id: string }>(async () => {
    const me = await requireRole(...MANAGE);
    const d = letterSchema.parse(input);
    const c = await loadOpenCase(d.caseId);
    const [tpl, settings, student] = await Promise.all([
      prisma.letterTemplate.findFirst({ where: { id: d.templateId, isActive: true } }),
      getSettings(),
      prisma.student.findUniqueOrThrow({ where: { id: c.studentId }, select: { name: true, class: { select: { name: true } } } }),
    ]);
    if (!tpl) throw new UserError("Template tidak ditemukan atau nonaktif.");
    const meetingAt = fromWitaInput(d.meetingDate, d.meetingTime);
    if (meetingAt.getTime() < Date.now()) throw new UserError("Jadwal pertemuan harus di masa depan.");
    const letterDate = new Date();

    await ensureLetterCounter(prisma, counterScope(settings.letterNumberFormat, tpl.type), letterDate);
    const letter = await withTxRetry(() =>
      prisma.$transaction(async (tx) => {
        const { number } = await nextLetterNumber(tx, settings.letterNumberFormat, tpl.type, letterDate);
        const body = renderLetterBody(tpl.body, {
          letterNumber: number,
          parentName: d.parentName,
          studentName: student.name,
          className: student.class?.name ?? "-",
          meetingAt,
          place: d.place,
          subject: d.subject,
          bkName: me.name,
          principalName: settings.principalName,
          principalNip: settings.principalNip,
        });
        const letter = await tx.summonsLetter.create({
          data: {
            caseId: c.id,
            templateId: tpl.id,
            type: tpl.type,
            letterNumber: number,
            letterDate,
            meetingAt,
            place: d.place,
            subject: d.subject,
            parentName: d.parentName,
            bodySnapshot: body,
            verifyToken: randomToken(18),
            responseToken: randomToken(24),
            createdById: me.id,
          },
        });
        await tx.case.update({
          where: { id: c.id },
          data: { status: c.status === "BARU" ? "DIJADWALKAN" : c.status, assignedBkId: c.assignedBkId ?? (me.role === "BK" ? me.id : null) },
        });
        return letter;
      }, { timeout: 15_000 }),
    );
    await audit({ userId: me.id, action: "CREATE", entity: "SummonsLetter", entityId: letter.id, after: { number: letter.letterNumber, type: letter.type, meetingAt } });
    if (APPROVAL_REQUIRED.includes(tpl.type)) {
      await prisma.$transaction(async (tx) =>
        notifyUsers(tx, await userIdsByRoles(tx, ["KEPSEK"]), {
          title: `Persetujuan surat: ${LETTER_TYPE_LABEL[tpl.type]}`,
          body: `${student.name} · ${letter.letterNumber}`,
          link: `/bk/surat/${letter.id}`,
        }),
      );
    }
    revalidateCase(c.id);
    return { ok: true, message: `Surat ${letter.letterNumber} dibuat.`, data: { id: letter.id } };
  });
}

async function loadLetter(id: string) {
  const l = await prisma.summonsLetter.findUnique({ where: { id }, include: { case: { include: { student: { include: { parents: { include: { parent: true } } } } } } } });
  if (!l || l.deletedAt) throw new UserError("Surat tidak ditemukan.");
  return l;
}

export async function approveLetter(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("KEPSEK");
    const l = await loadLetter(id);
    if (l.approvedAt) throw new UserError("Surat sudah disetujui.");
    await prisma.$transaction(async (tx) => {
      await tx.summonsLetter.update({ where: { id }, data: { approvedById: me.id, approvedAt: new Date() } });
      await notifyUsers(tx, [l.createdById], { title: "Surat disetujui Kepala Sekolah", body: l.letterNumber, link: `/bk/surat/${id}` });
    });
    await audit({ userId: me.id, action: "APPROVE", entity: "SummonsLetter", entityId: id });
    revalidateCase(l.caseId);
    return { ok: true, message: "Surat disetujui." };
  });
}

function letterWaMessage(l: { type: keyof typeof LETTER_TYPE_LABEL; letterNumber: string; meetingAt: Date; place: string; responseToken: string }, parentName: string, studentName: string, school: string, prefix = "") {
  return `${prefix}Yth. Bapak/Ibu ${parentName},
${school} mengundang Bapak/Ibu terkait ananda ${studentName}.

${LETTER_TYPE_LABEL[l.type]} No. ${l.letterNumber}
Hari/tanggal: ${formatLongDate(l.meetingAt)}
Pukul: ${formatTime(l.meetingAt)} WITA
Tempat: ${l.place}

Surat & konfirmasi kehadiran:
${appUrl(`/konfirmasi/${l.responseToken}`)}`;
}

/** Tandai terkirim & kirim tautan surat ke WA orang tua (via antrean). */
export async function sendLetter(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...MANAGE);
    const l = await loadLetter(id);
    if (l.status !== "DRAFT") throw new UserError("Surat sudah dikirim.");
    if (APPROVAL_REQUIRED.includes(l.type) && !l.approvedAt) throw new UserError("Surat ini harus disetujui Kepala Sekolah sebelum dikirim.");
    const settings = await getSettings();
    const parents = l.case.student.parents.map((p) => p.parent).filter((p) => p.waNumber);
    await prisma.$transaction(async (tx) => {
      await tx.summonsLetter.update({ where: { id }, data: { status: "TERKIRIM", sentAt: new Date() } });
      await enqueueWa(
        tx,
        parents.map((p) => ({ to: p.waNumber, recipientName: p.name, context: "LETTER", refId: id, message: letterWaMessage(l, p.name, l.case.student.name, settings.schoolName) })),
      );
      // portal ortu: notifikasi in-app bila orang tua punya akun
      await notifyUsers(tx, parents.map((p) => p.userId ?? "").filter(Boolean), {
        title: `${LETTER_TYPE_LABEL[l.type]} untuk ${l.case.student.name}`,
        body: `${formatLongDate(l.meetingAt)} pukul ${formatTime(l.meetingAt)} WITA · ${l.place}. Mohon konfirmasi kehadiran.`,
        link: `/konfirmasi/${l.responseToken}`,
      });
    });
    await audit({ userId: me.id, action: "SEND", entity: "SummonsLetter", entityId: id, after: { recipients: parents.length } });
    revalidateCase(l.caseId);
    return {
      ok: true,
      message: parents.length ? `Surat ditandai terkirim; tautan masuk antrean WA untuk ${parents.length} orang tua.` : "Surat ditandai terkirim (tidak ada nomor WA orang tua — kirim manual/cetak).",
    };
  });
}

export async function recordAttendance(id: string, attendance: "HADIR" | "TIDAK_HADIR", note?: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...MANAGE);
    const l = await loadLetter(id);
    if (l.status === "DRAFT") throw new UserError("Surat belum dikirim.");
    await prisma.$transaction(async (tx) => {
      await tx.summonsLetter.update({ where: { id }, data: { status: attendance, attendanceNote: note?.trim() || null } });
      if (attendance === "HADIR" && ["BARU", "DIJADWALKAN"].includes(l.case.status)) {
        await tx.case.update({ where: { id: l.caseId }, data: { status: "PROSES_PENDAMPINGAN" } });
      }
    });
    await audit({ userId: me.id, action: "ATTENDANCE", entity: "SummonsLetter", entityId: id, after: { attendance, note } });
    revalidateCase(l.caseId);
    return {
      ok: true,
      message: attendance === "HADIR" ? "Kehadiran dicatat." : "Ketidakhadiran dicatat. Pertimbangkan surat panggilan tingkat berikutnya.",
    };
  });
}

export async function rescheduleLetter(id: string, input: z.infer<typeof rescheduleSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...MANAGE);
    const d = rescheduleSchema.parse(input);
    const l = await loadLetter(id);
    if (!["TERKIRIM", "JADWAL_ULANG", "DIKONFIRMASI"].includes(l.status)) throw new UserError("Surat ini tidak dapat dijadwal ulang.");
    const meetingAt = fromWitaInput(d.meetingDate, d.meetingTime);
    if (meetingAt.getTime() < Date.now()) throw new UserError("Jadwal baru harus di masa depan.");
    const settings = await getSettings();
    const parents = l.case.student.parents.map((p) => p.parent).filter((p) => p.waNumber);
    await prisma.$transaction(async (tx) => {
      const upd = await tx.summonsLetter.update({
        where: { id },
        data: { meetingAt, place: d.place, status: "TERKIRIM", reminderSentAt: null, parentResponse: null, parentResponseAt: null },
      });
      await enqueueWa(
        tx,
        parents.map((p) => ({ to: p.waNumber, recipientName: p.name, context: "LETTER", refId: id, message: letterWaMessage(upd, p.name, l.case.student.name, settings.schoolName, "[JADWAL BARU] ") })),
      );
    });
    await audit({ userId: me.id, action: "RESCHEDULE", entity: "SummonsLetter", entityId: id, before: { meetingAt: l.meetingAt, place: l.place }, after: { meetingAt, place: d.place } });
    revalidateCase(l.caseId);
    return { ok: true, message: "Jadwal diperbarui dan dikirim ulang ke orang tua." };
  });
}

export async function deleteLetter(id: string, reason?: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...MANAGE);
    const why = reasonSchema.parse(reason ?? "");
    const l = await loadLetter(id);
    await prisma.summonsLetter.update({ where: { id }, data: { deletedAt: new Date(), deleteReason: why } });
    await audit({ userId: me.id, action: "DELETE", entity: "SummonsLetter", entityId: id, before: { number: l.letterNumber, status: l.status }, after: { reason: why } });
    revalidateCase(l.caseId);
    return { ok: true, message: "Surat dibatalkan. Nomor surat tetap tercatat (tidak dipakai ulang)." };
  });
}

// ───────────────────────── Sesi pendampingan ─────────────────────────

export async function scheduleSession(input: SessionScheduleInput): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("BK");
    const d = sessionScheduleSchema.parse(input);
    const c = await loadOpenCase(d.caseId);
    const scheduledAt = fromWitaInput(d.date, d.time);
    const s = await prisma.$transaction(async (tx) => {
      const s = await tx.counselingSession.create({ data: { caseId: c.id, scheduledAt, type: d.type, place: d.place || null, counselorId: me.id } });
      await tx.case.update({ where: { id: c.id }, data: { status: c.status === "BARU" ? "DIJADWALKAN" : c.status, assignedBkId: c.assignedBkId ?? me.id } });
      return s;
    });
    await audit({ userId: me.id, action: "CREATE", entity: "CounselingSession", entityId: s.id, after: { scheduledAt, type: d.type } });
    revalidateCase(c.id);
    return { ok: true, message: "Sesi dijadwalkan." };
  });
}

/** Catat hasil sesi (rahasia). FormData: data (JSON) + photos (maks 3). */
export async function recordSession(sessionId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("BK");
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("data") ?? "{}"));
    } catch {
      throw new UserError("Data form tidak valid.");
    }
    const d: SessionRecordInput = sessionRecordSchema.parse(raw);
    const s = await prisma.counselingSession.findUnique({ where: { id: sessionId }, include: { case: true } });
    if (!s) throw new UserError("Sesi tidak ditemukan.");
    if (s.status === "BATAL") throw new UserError("Sesi sudah dibatalkan.");
    const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (photos.length > 3) throw new UserError("Maksimal 3 lampiran.");
    const saved: Awaited<ReturnType<typeof saveImage>>[] = [];
    try {
      for (const f of photos) saved.push(await saveImage(f, `counseling/${new Date().getFullYear()}`, 3 * 1024 * 1024));
      await prisma.$transaction(async (tx) => {
        await tx.counselingSession.update({
          where: { id: sessionId },
          data: {
            ...d,
            followUpPlan: d.followUpPlan || null,
            status: "SELESAI",
            attachments: { create: saved.map((a) => ({ path: a.path, mimeType: a.mimeType, size: a.size })) },
          },
        });
        if (["BARU", "DIJADWALKAN"].includes(s.case.status)) await tx.case.update({ where: { id: s.caseId }, data: { status: "PROSES_PENDAMPINGAN" } });
      });
    } catch (e) {
      await Promise.all(saved.map((a) => deleteUpload(a.path)));
      throw e;
    }
    // isi sesi rahasia: audit hanya mencatat bahwa sesi dicatat, bukan isinya
    await audit({ userId: me.id, action: "RECORD", entity: "CounselingSession", entityId: sessionId, after: { attachments: saved.length } });
    revalidateCase(s.caseId);
    return { ok: true, message: "Hasil sesi disimpan." };
  });
}

export async function cancelSession(sessionId: string, reason?: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("BK");
    const why = reasonSchema.parse(reason ?? "");
    const s = await prisma.counselingSession.findUnique({ where: { id: sessionId } });
    if (!s || s.status !== "DIJADWALKAN") throw new UserError("Sesi tidak dapat dibatalkan.");
    await prisma.counselingSession.update({ where: { id: sessionId }, data: { status: "BATAL", followUpPlan: `Dibatalkan: ${why}` } });
    await audit({ userId: me.id, action: "CANCEL", entity: "CounselingSession", entityId: sessionId, after: { reason: why } });
    revalidateCase(s.caseId);
    return { ok: true, message: "Sesi dibatalkan." };
  });
}
