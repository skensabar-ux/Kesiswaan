import "server-only";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { accumulatePoints, maxPriority, newlyReachedThresholds, planCase, type ThresholdLike } from "@/lib/points";
import { homeroomUserId, notifyUsers, userIdsByRoles } from "@/lib/notify";
import { enqueueWa } from "@/lib/wa/queue";
import { renderTemplate } from "@/lib/template";
import { formatDate } from "@/lib/date";
import { appUrl } from "@/lib/url";

type Tx = Prisma.TransactionClient;

/** Kondisi kejadian yang dihitung ke poin: terverifikasi & tidak dihapus. */
export const COUNTED_INCIDENT = { status: "TERVERIFIKASI", deletedAt: null } as const satisfies Prisma.IncidentWhereInput;

export type Threshold = ThresholdLike & { notifyRoles: Role[] };

export async function loadThresholds(tx: Tx = prisma): Promise<Threshold[]> {
  const rows = await tx.sanctionThreshold.findMany({
    select: { id: true, minPoints: true, isActive: true, autoCreateCase: true, requiresApproval: true, templateId: true, color: true, action: true, notifyRoles: true },
    orderBy: { minPoints: "asc" },
  });
  return rows.map((r) => ({ ...r, notifyRoles: (Array.isArray(r.notifyRoles) ? r.notifyRoles : []) as Role[] }));
}

/** Total poin banyak siswa pada satu tahun ajaran (Map studentId → poin). */
export async function pointsForStudents(studentIds: string[], academicYearId: string, tx: Tx = prisma) {
  const result = new Map<string, number>(studentIds.map((id) => [id, 0]));
  if (studentIds.length === 0) return result;
  const settings = await getSettings();
  const [violations, achievements] = await Promise.all([
    tx.incidentStudent.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, incident: { ...COUNTED_INCIDENT, academicYearId } },
      _sum: { points: true },
    }),
    settings.achievementReducesPoints
      ? tx.achievement.groupBy({
          by: ["studentId"],
          where: { studentId: { in: studentIds }, academicYearId, deletedAt: null },
          _sum: { points: true },
        })
      : Promise.resolve([] as { studentId: string; _sum: { points: number | null } }[]),
  ]);
  const ach = new Map(achievements.map((a) => [a.studentId, a._sum.points ?? 0]));
  for (const v of violations) {
    result.set(v.studentId, accumulatePoints([v._sum.points ?? 0], [ach.get(v.studentId) ?? 0], settings.achievementReducesPoints));
  }
  return result;
}

export async function studentPoints(studentId: string, academicYearId: string, tx: Tx = prisma) {
  return (await pointsForStudents([studentId], academicYearId, tx)).get(studentId) ?? 0;
}

export type ApplySummary = { studentId: string; name: string; total: number; thresholds: number[]; caseAction: "none" | "create" | "link" }[];

/**
 * Terapkan efek kejadian yang baru TERVERIFIKASI (dipanggil di dalam transaksi):
 * 1. hitung ulang total poin tiap siswa (tahun ajaran kejadian)
 * 2. catat ambang yang baru tercapai (ThresholdHit — tidak terpicu dua kali)
 * 3. buat / tautkan kasus BK (ambang autoCreateCase atau kategori BERAT)
 * 4. notifikasi in-app: wali kelas selalu; role sesuai ambang; BK bila ada kasus
 *    (WhatsApp ke wali & orang tua ditambahkan di Tahap 3)
 */
export async function applyVerifiedIncident(tx: Tx, incidentId: string, actorId: string): Promise<ApplySummary> {
  const incident = await tx.incident.findUniqueOrThrow({
    where: { id: incidentId },
    include: {
      students: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              classId: true,
              class: { select: { name: true, waliKelas: { select: { name: true, user: { select: { phone: true, isActive: true } } } } } },
              parents: { select: { parent: { select: { name: true, waNumber: true } } } },
            },
          },
        },
      },
    },
  });
  const [thresholds, settings] = await Promise.all([loadThresholds(tx), getSettings()]);
  const yearId = incident.academicYearId;
  const link = `/kejadian/${incident.id}`;
  const summary: ApplySummary = [];

  // satu siswa bisa punya >1 baris (beberapa jenis pelanggaran) — kelompokkan
  const byStudent = new Map<string, typeof incident.students>();
  for (const row of incident.students) byStudent.set(row.studentId, [...(byStudent.get(row.studentId) ?? []), row]);

  for (const [studentId, rows] of byStudent) {
    const student = rows[0]!.student;
    const total = await studentPoints(studentId, yearId, tx);
    const hits = await tx.thresholdHit.findMany({ where: { studentId, academicYearId: yearId }, select: { thresholdId: true } });
    const reached = newlyReachedThresholds(thresholds, total, hits.map((h) => h.thresholdId));
    if (reached.length) {
      await tx.thresholdHit.createMany({
        data: reached.map((t) => ({ studentId, academicYearId: yearId, thresholdId: t.id, incidentId, totalPoints: total })),
        skipDuplicates: true,
      });
    }
    const hasSevere = rows.some((r) => r.level === "BERAT");
    const activeCase = await tx.case.findFirst({
      where: { studentId, academicYearId: yearId, status: { notIn: ["SELESAI", "DIRUJUK"] } },
      orderBy: { openedAt: "desc" },
    });
    const plan = planCase({ newThresholds: reached, hasSevere, hasActiveCase: Boolean(activeCase) });

    let caseId: string | null = null;
    if (plan.action === "create") {
      const c = await tx.case.create({
        data: {
          studentId,
          academicYearId: yearId,
          title: plan.reason,
          priority: plan.priority,
          thresholdId: plan.thresholdId,
          needsLetter: plan.needsLetter,
          needsApproval: plan.needsApproval,
          createdById: actorId,
          incidents: { create: { incidentId } },
        },
      });
      caseId = c.id;
      await tx.auditLog.create({ data: { userId: actorId, action: "AUTO_CREATE", entity: "Case", entityId: c.id, after: { reason: plan.reason, incidentId } } });
    } else if (plan.action === "link" && activeCase) {
      await tx.case.update({
        where: { id: activeCase.id },
        data: {
          priority: maxPriority(activeCase.priority, plan.priority),
          needsLetter: activeCase.needsLetter || plan.needsLetter,
          needsApproval: activeCase.needsApproval || plan.needsApproval,
          ...(plan.thresholdId ? { thresholdId: plan.thresholdId } : {}),
          incidents: { connectOrCreate: { where: { caseId_incidentId: { caseId: activeCase.id, incidentId } }, create: { incidentId } } },
        },
      });
      caseId = activeCase.id;
    } else if (activeCase) {
      // kejadian ringan pada siswa yang sedang ditangani BK tetap masuk timeline kasus
      await tx.caseIncident.upsert({
        where: { caseId_incidentId: { caseId: activeCase.id, incidentId } },
        create: { caseId: activeCase.id, incidentId },
        update: {},
      });
    }

    // ── notifikasi in-app
    const violationNames = [...new Set(rows.map((r) => r.violationName))].join(", ");
    const pts = rows.reduce((a, r) => a + r.points, 0);
    const walas = await homeroomUserId(tx, student.classId);
    const cls = student.class?.name ?? "-";
    if (walas) {
      await notifyUsers(tx, [walas], {
        title: `Pelanggaran: ${student.name} (${cls})`,
        body: `${violationNames} (+${pts} poin). Total poin: ${total}.`,
        link,
      });
    }
    for (const t of reached) {
      // WALI_KELAS berarti wali kelas siswa ini saja, bukan semua wali kelas
      const roles = t.notifyRoles.filter((r) => r !== "WALI_KELAS");
      const wantsWalas = t.notifyRoles.includes("WALI_KELAS");
      const targets = [...(await userIdsByRoles(tx, roles)), ...(wantsWalas && walas ? [walas] : [])];
      await notifyUsers(tx, targets, {
        title: `Ambang ${t.minPoints} poin: ${student.name} (${cls})`,
        body: `${t.action}. Total poin saat ini: ${total}.`,
        link: `/siswa/${studentId}`,
      });
    }
    if (plan.action === "create") {
      await notifyUsers(tx, await userIdsByRoles(tx, ["BK"]), {
        title: `Kasus BK baru: ${student.name} (${cls})`,
        body: plan.reason,
        link: caseId ? `/siswa/${studentId}` : link,
      });
    }

    // ── WhatsApp (antrean; dikirim bertahap oleh cron)
    const walasInfo = student.class?.waliKelas;
    const vars = {
      nama_siswa: student.name,
      kelas: cls,
      tanggal: formatDate(incident.occurredAt),
      jenis_pelanggaran: violationNames,
      poin: pts,
      total_poin: total,
      nama_walas: walasInfo?.name ?? "-",
    };
    await enqueueWa(tx, [
      ...student.parents.map(({ parent }) => ({
        to: parent.waNumber,
        recipientName: parent.name,
        message: renderTemplate(settings.waViolationTemplate, { ...vars, nama_ortu: parent.name }),
        context: "INCIDENT",
        refId: incidentId,
      })),
      ...(walasInfo?.user?.isActive
        ? [
            {
              to: walasInfo.user.phone,
              recipientName: walasInfo.name,
              message: `[Kesiswaan] ${student.name} (${cls}) tercatat: ${violationNames} (+${pts} poin). Total poin: ${total}.${
                reached.length ? ` Ambang ${reached.at(-1)!.minPoints}: ${reached.at(-1)!.action}.` : ""
              }\n${appUrl(link)}`,
              context: "INCIDENT_WALAS",
              refId: incidentId,
            },
          ]
        : []),
    ]);

    summary.push({ studentId, name: student.name, total, thresholds: reached.map((t) => t.minPoints), caseAction: plan.action });
  }
  return summary;
}
