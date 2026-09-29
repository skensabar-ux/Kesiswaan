/**
 * Logika poin & ambang sanksi (fungsi murni, tanpa database — mudah diuji).
 * Lapisan database ada di lib/points-db.ts.
 */

export type ThresholdLike = {
  id: string;
  minPoints: number;
  isActive: boolean;
  autoCreateCase: boolean;
  requiresApproval: boolean;
  templateId: string | null;
  color: string;
  action: string;
};

export type StatusColor = "green" | "amber" | "red";

/** Akumulasi poin: total pelanggaran, dikurangi prestasi bila kebijakan aktif. Tidak pernah negatif. */
export function accumulatePoints(violationPoints: number[], achievementPoints: number[], achievementReducesPoints: boolean) {
  const violations = violationPoints.reduce((a, b) => a + b, 0);
  const achievements = achievementPoints.reduce((a, b) => a + b, 0);
  return Math.max(0, violations - (achievementReducesPoints ? achievements : 0));
}

function active<T extends ThresholdLike>(thresholds: T[]): T[] {
  return thresholds.filter((t) => t.isActive).sort((a, b) => a.minPoints - b.minPoints);
}

/** Ambang yang baru tercapai: aktif, minPoints ≤ total, dan belum pernah tercapai tahun ajaran ini. */
export function newlyReachedThresholds<T extends ThresholdLike>(thresholds: T[], total: number, alreadyHit: Iterable<string>): T[] {
  const hit = new Set(alreadyHit);
  return active(thresholds).filter((t) => t.minPoints <= total && !hit.has(t.id));
}

/** Ambang tertinggi yang sudah dilewati total poin (untuk warna status), atau null. */
export function currentThreshold<T extends ThresholdLike>(thresholds: T[], total: number): T | null {
  const reached = active(thresholds).filter((t) => t.minPoints <= total);
  return reached.at(-1) ?? null;
}

/** Ambang berikutnya yang belum tercapai, atau null. */
export function nextThreshold<T extends ThresholdLike>(thresholds: T[], total: number): T | null {
  return active(thresholds).find((t) => t.minPoints > total) ?? null;
}

/** Warna status poin: hijau bila belum mencapai ambang apa pun, selain itu warna ambang tertinggi. */
export function statusColor(thresholds: ThresholdLike[], total: number): StatusColor {
  const c = currentThreshold(thresholds, total)?.color;
  return c === "red" || c === "amber" ? c : "green";
}

export type CasePlan =
  | { action: "none" }
  | {
      action: "create" | "link";
      thresholdId: string | null;
      priority: "RENDAH" | "SEDANG" | "TINGGI";
      needsLetter: boolean;
      needsApproval: boolean;
      reason: string;
    };

/**
 * Tentukan tindakan kasus BK untuk satu siswa setelah kejadian terverifikasi.
 * - Kasus dibuat bila ada ambang baru dengan autoCreateCase, atau pelanggaran kategori BERAT.
 * - Bila siswa sudah punya kasus aktif, kejadian ditautkan ke kasus itu (tidak membuat kasus baru).
 */
export function planCase(input: {
  newThresholds: ThresholdLike[];
  hasSevere: boolean;
  hasActiveCase: boolean;
}): CasePlan {
  const caseThresholds = input.newThresholds.filter((t) => t.autoCreateCase);
  if (caseThresholds.length === 0 && !input.hasSevere) return { action: "none" };

  const top = caseThresholds.at(-1) ?? null;
  const needsApproval = input.newThresholds.some((t) => t.requiresApproval);
  const priority = input.hasSevere || needsApproval || (top && top.minPoints >= 100) ? "TINGGI" : "SEDANG";
  const reason = top
    ? `Akumulasi poin mencapai ${top.minPoints}: ${top.action}`
    : "Pelanggaran kategori berat";

  return {
    action: input.hasActiveCase ? "link" : "create",
    thresholdId: top?.id ?? null,
    priority,
    needsLetter: Boolean(top?.templateId),
    needsApproval,
    reason,
  };
}

const PRIORITY_RANK = { RENDAH: 0, SEDANG: 1, TINGGI: 2 } as const;

/** Prioritas tertinggi dari dua nilai (kasus yang ditautkan tidak pernah turun prioritas). */
export function maxPriority<P extends keyof typeof PRIORITY_RANK>(a: P, b: P): P {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}
