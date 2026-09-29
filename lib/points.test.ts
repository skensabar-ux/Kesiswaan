import { describe, expect, it } from "vitest";
import {
  accumulatePoints,
  currentThreshold,
  maxPriority,
  newlyReachedThresholds,
  nextThreshold,
  planCase,
  statusColor,
  type ThresholdLike,
} from "./points";

const T = (minPoints: number, extra: Partial<ThresholdLike> = {}): ThresholdLike => ({
  id: `t${minPoints}`,
  minPoints,
  isActive: true,
  autoCreateCase: minPoints >= 50,
  requiresApproval: minPoints >= 150,
  templateId: minPoints >= 50 && minPoints <= 100 ? `tpl${minPoints}` : null,
  color: minPoints >= 75 ? "red" : "amber",
  action: `Tindakan ${minPoints}`,
  ...extra,
});
// ambang default (tabel 4.3), sengaja tidak urut
const DEFAULTS = [T(100), T(25), T(150), T(50), T(75)];

describe("accumulatePoints", () => {
  it("menjumlahkan poin pelanggaran", () => expect(accumulatePoints([5, 10, 25], [], false)).toBe(40));
  it("prestasi tidak mengurangi bila kebijakan nonaktif", () => expect(accumulatePoints([30], [20], false)).toBe(30));
  it("prestasi mengurangi bila kebijakan aktif", () => expect(accumulatePoints([30], [20], true)).toBe(10));
  it("tidak pernah negatif", () => expect(accumulatePoints([5], [50], true)).toBe(0));
  it("kosong = 0", () => expect(accumulatePoints([], [], true)).toBe(0));
});

describe("newlyReachedThresholds", () => {
  it("mengembalikan ambang yang terlewati, urut naik", () => {
    expect(newlyReachedThresholds(DEFAULTS, 60, []).map((t) => t.minPoints)).toEqual([25, 50]);
  });
  it("tepat di batas dihitung tercapai", () => {
    expect(newlyReachedThresholds(DEFAULTS, 25, []).map((t) => t.minPoints)).toEqual([25]);
  });
  it("tidak memicu ulang ambang yang sudah tercapai", () => {
    expect(newlyReachedThresholds(DEFAULTS, 80, ["t25", "t50"]).map((t) => t.minPoints)).toEqual([75]);
  });
  it("lompatan besar memicu beberapa ambang sekaligus", () => {
    expect(newlyReachedThresholds(DEFAULTS, 150, ["t25"]).map((t) => t.minPoints)).toEqual([50, 75, 100, 150]);
  });
  it("mengabaikan ambang nonaktif", () => {
    const list = [T(25, { isActive: false }), T(50)];
    expect(newlyReachedThresholds(list, 60, []).map((t) => t.minPoints)).toEqual([50]);
  });
  it("di bawah ambang terendah → kosong", () => expect(newlyReachedThresholds(DEFAULTS, 24, [])).toEqual([]));
});

describe("status & ambang berikutnya", () => {
  it("hijau bila belum mencapai ambang", () => expect(statusColor(DEFAULTS, 10)).toBe("green"));
  it("kuning di 25–74", () => {
    expect(statusColor(DEFAULTS, 25)).toBe("amber");
    expect(statusColor(DEFAULTS, 74)).toBe("amber");
  });
  it("merah mulai 75", () => expect(statusColor(DEFAULTS, 75)).toBe("red"));
  it("ambang saat ini & berikutnya", () => {
    expect(currentThreshold(DEFAULTS, 60)?.minPoints).toBe(50);
    expect(nextThreshold(DEFAULTS, 60)?.minPoints).toBe(75);
    expect(nextThreshold(DEFAULTS, 200)).toBeNull();
    expect(currentThreshold(DEFAULTS, 0)).toBeNull();
  });
});

describe("planCase", () => {
  it("ambang 25 saja (tanpa kasus) → tidak ada tindakan", () => {
    expect(planCase({ newThresholds: [T(25)], hasSevere: false, hasActiveCase: false })).toEqual({ action: "none" });
  });

  it("ambang 50 → buat kasus + perlu surat panggilan", () => {
    const p = planCase({ newThresholds: [T(25), T(50)], hasSevere: false, hasActiveCase: false });
    expect(p).toMatchObject({ action: "create", thresholdId: "t50", priority: "SEDANG", needsLetter: true, needsApproval: false });
  });

  it("sudah ada kasus aktif → tautkan, bukan buat baru", () => {
    const p = planCase({ newThresholds: [T(75)], hasSevere: false, hasActiveCase: true });
    expect(p).toMatchObject({ action: "link", thresholdId: "t75" });
  });

  it("pelanggaran berat tanpa ambang → kasus prioritas tinggi", () => {
    const p = planCase({ newThresholds: [], hasSevere: true, hasActiveCase: false });
    expect(p).toMatchObject({ action: "create", thresholdId: null, priority: "TINGGI", needsLetter: false });
  });

  it("ambang 150 butuh approval Kepsek & prioritas tinggi", () => {
    const p = planCase({ newThresholds: [T(100), T(150)], hasSevere: false, hasActiveCase: false });
    expect(p).toMatchObject({ action: "create", thresholdId: "t150", priority: "TINGGI", needsApproval: true });
  });
});

describe("maxPriority", () => {
  it("tidak menurunkan prioritas", () => {
    expect(maxPriority("TINGGI", "SEDANG")).toBe("TINGGI");
    expect(maxPriority("RENDAH", "SEDANG")).toBe("SEDANG");
  });
});
