"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { fromWitaInput } from "@/lib/date";
import { getActiveAcademicYear } from "@/lib/settings";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { applyVerifiedIncident, type ApplySummary } from "@/lib/points-db";
import { notifyUsers, userIdsByRoles } from "@/lib/notify";
import { REPORTER_ROLES } from "@/lib/roles";
import { MAX_PHOTOS, incidentSchema, reasonSchema } from "@/lib/validators/incident";

const TX_OPTS = { timeout: 20_000, maxWait: 10_000 };
const VERIFIER_ROLES = ["ADMIN", "PKS"] as const;

function summarize(summary: ApplySummary) {
  const parts: string[] = [];
  const cases = summary.filter((s) => s.caseAction === "create").length;
  const linked = summary.filter((s) => s.caseAction === "link").length;
  const thresholds = summary.filter((s) => s.thresholds.length).map((s) => `${s.name} (≥${Math.max(...s.thresholds)})`);
  if (thresholds.length) parts.push(`Ambang tercapai: ${thresholds.join(", ")}`);
  if (cases) parts.push(`${cases} kasus BK dibuat`);
  if (linked) parts.push(`${linked} ditautkan ke kasus aktif`);
  return parts.join(" · ");
}

/** Catat kejadian. Dari GURU/WALI_KELAS/BK → menunggu verifikasi; dari PKS/ADMIN → langsung terverifikasi. */
export async function createIncident(formData: FormData): Promise<ActionResult<{ id: string; verified: boolean }>> {
  return runAction<{ id: string; verified: boolean }>(async () => {
    const me = await requireRole(...REPORTER_ROLES);
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("data") ?? "{}"));
    } catch {
      throw new UserError("Data form tidak valid.");
    }
    const d = incidentSchema.parse(raw);
    const occurredAt = fromWitaInput(d.date, d.time);
    if (occurredAt.getTime() > Date.now() + 5 * 60_000) throw new UserError("Waktu kejadian tidak boleh di masa depan.");

    const year = await getActiveAcademicYear();
    if (!year) throw new UserError("Belum ada tahun ajaran aktif. Hubungi admin.");

    const vt = await prisma.violationType.findFirst({ where: { id: d.violationTypeId, isActive: true }, include: { category: true } });
    if (!vt) throw new UserError("Jenis pelanggaran tidak ditemukan atau nonaktif.");

    const studentIds = [...new Set(d.studentIds)];
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, isActive: true },
      select: { id: true, classId: true, class: { select: { name: true } } },
    });
    if (students.length !== studentIds.length) throw new UserError("Ada siswa yang tidak ditemukan atau nonaktif.");

    const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (photos.length > MAX_PHOTOS) throw new UserError(`Maksimal ${MAX_PHOTOS} foto.`);
    const now = new Date();
    const saved: Awaited<ReturnType<typeof saveImage>>[] = [];
    try {
      for (const f of photos) saved.push(await saveImage(f, `incidents/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`, 3 * 1024 * 1024));
    } catch (e) {
      await Promise.all(saved.map((s) => deleteUpload(s.path)));
      throw e;
    }

    const autoVerify = (VERIFIER_ROLES as readonly string[]).includes(me.role);
    try {
      const { incident, summary } = await prisma.$transaction(async (tx) => {
        const incident = await tx.incident.create({
          data: {
            occurredAt,
            location: d.location,
            chronology: d.chronology,
            initialAction: d.initialAction || null,
            reporterName: d.reporterName || null,
            witnesses: d.witnesses || null,
            reporterId: me.id,
            academicYearId: year.id,
            status: autoVerify ? "TERVERIFIKASI" : "MENUNGGU_VERIFIKASI",
            verifiedById: autoVerify ? me.id : null,
            verifiedAt: autoVerify ? now : null,
            students: {
              create: students.map((s) => ({
                studentId: s.id,
                violationTypeId: vt.id,
                points: vt.points,
                violationName: vt.name,
                level: vt.category.level,
                classId: s.classId,
                className: s.class?.name ?? null,
              })),
            },
            attachments: { create: saved.map((s) => ({ path: s.path, mimeType: s.mimeType, size: s.size })) },
          },
        });
        let summary: ApplySummary = [];
        if (autoVerify) {
          summary = await applyVerifiedIncident(tx, incident.id, me.id);
        } else {
          await notifyUsers(tx, await userIdsByRoles(tx, ["PKS"]), {
            title: "Laporan kejadian menunggu verifikasi",
            body: `${vt.name} · ${students.length} siswa · dilaporkan oleh ${me.name}`,
            link: `/kejadian/${incident.id}`,
          });
        }
        return { incident, summary };
      }, TX_OPTS);

      await audit({ userId: me.id, action: "CREATE", entity: "Incident", entityId: incident.id, after: { ...d, status: incident.status, photos: saved.length } });
      revalidatePath("/kejadian");
      const extra = summarize(summary);
      return {
        ok: true,
        message: autoVerify ? `Kejadian dicatat & terverifikasi.${extra ? " " + extra : ""}` : "Laporan terkirim, menunggu verifikasi PKS.",
        data: { id: incident.id, verified: autoVerify },
      };
    } catch (e) {
      await Promise.all(saved.map((s) => deleteUpload(s.path)));
      throw e;
    }
  });
}

async function loadPending(id: string) {
  const inc = await prisma.incident.findUnique({ where: { id } });
  if (!inc || inc.deletedAt) throw new UserError("Kejadian tidak ditemukan.");
  if (inc.status !== "MENUNGGU_VERIFIKASI") throw new UserError("Kejadian ini sudah diproses.");
  return inc;
}

export async function verifyIncident(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...VERIFIER_ROLES);
    const before = await loadPending(id);
    const summary = await prisma.$transaction(async (tx) => {
      // updateMany + kondisi status mencegah verifikasi ganda bila dua PKS menekan bersamaan
      const res = await tx.incident.updateMany({
        where: { id, status: "MENUNGGU_VERIFIKASI", deletedAt: null },
        data: { status: "TERVERIFIKASI", verifiedById: me.id, verifiedAt: new Date() },
      });
      if (res.count === 0) throw new UserError("Kejadian ini sudah diproses.");
      const summary = await applyVerifiedIncident(tx, id, me.id);
      await notifyUsers(tx, [before.reporterId].filter((u) => u !== me.id), {
        title: "Laporan Anda diverifikasi",
        body: `Laporan kejadian di ${before.location} telah diverifikasi oleh ${me.name}.`,
        link: `/kejadian/${id}`,
      });
      return summary;
    }, TX_OPTS);
    await audit({ userId: me.id, action: "VERIFY", entity: "Incident", entityId: id, before: { status: before.status }, after: { status: "TERVERIFIKASI", summary } });
    revalidatePath("/kejadian");
    const extra = summarize(summary);
    return { ok: true, message: `Kejadian diverifikasi.${extra ? " " + extra : ""}` };
  });
}

export async function rejectIncident(id: string, reason?: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...VERIFIER_ROLES);
    const why = reasonSchema.parse(reason ?? "");
    const before = await loadPending(id);
    await prisma.$transaction(async (tx) => {
      const res = await tx.incident.updateMany({
        where: { id, status: "MENUNGGU_VERIFIKASI", deletedAt: null },
        data: { status: "DITOLAK", verifiedById: me.id, verifiedAt: new Date(), rejectionReason: why },
      });
      if (res.count === 0) throw new UserError("Kejadian ini sudah diproses.");
      await notifyUsers(tx, [before.reporterId].filter((u) => u !== me.id), {
        title: "Laporan Anda ditolak",
        body: `Alasan: ${why}`,
        link: `/kejadian/${id}`,
      });
    });
    await audit({ userId: me.id, action: "REJECT", entity: "Incident", entityId: id, before: { status: before.status }, after: { status: "DITOLAK", reason: why } });
    revalidatePath("/kejadian");
    return { ok: true, message: "Laporan ditolak." };
  });
}

function canDelete(me: SessionUser, inc: { reporterId: string; status: string }) {
  if (me.role === "ADMIN" || me.role === "PKS") return true;
  return inc.reporterId === me.id && inc.status === "MENUNGGU_VERIFIKASI";
}

/**
 * Soft delete dengan alasan. Poin siswa otomatis berkurang karena poin dihitung dari
 * kejadian terverifikasi yang tidak dihapus. Kasus BK & penanda ambang yang sudah terbentuk tetap ada.
 */
export async function deleteIncident(id: string, reason?: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole(...REPORTER_ROLES);
    const why = reasonSchema.parse(reason ?? "");
    const inc = await prisma.incident.findUnique({ where: { id } });
    if (!inc || inc.deletedAt) throw new UserError("Kejadian tidak ditemukan.");
    if (!canDelete(me, inc)) throw new UserError("Anda tidak berhak menghapus kejadian ini.");
    await prisma.incident.update({ where: { id }, data: { deletedAt: new Date(), deleteReason: why } });
    await audit({ userId: me.id, action: "DELETE", entity: "Incident", entityId: id, before: { status: inc.status }, after: { deleteReason: why } });
    revalidatePath("/kejadian");
    return { ok: true, message: "Kejadian dihapus." };
  });
}
