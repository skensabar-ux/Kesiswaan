import type { LetterType } from "@prisma/client";
import { formatLongDate, formatTime } from "@/lib/date";
import { renderTemplate } from "@/lib/template";

/** Jenis surat yang wajib disetujui Kepala Sekolah sebelum dikirim. */
export const APPROVAL_REQUIRED: LetterType[] = ["PANGGILAN_3", "PERJANJIAN"];

export const LETTER_STATUS_LABEL = {
  DRAFT: "Draf",
  TERKIRIM: "Terkirim",
  DIKONFIRMASI: "Dikonfirmasi hadir",
  JADWAL_ULANG: "Minta jadwal ulang",
  HADIR: "Hadir",
  TIDAK_HADIR: "Tidak hadir",
} as const;

export function letterBadgeVariant(s: keyof typeof LETTER_STATUS_LABEL) {
  return s === "HADIR" || s === "DIKONFIRMASI" ? "success" : s === "TIDAK_HADIR" ? "destructive" : s === "DRAFT" ? "secondary" : "warning";
}

/** Tingkat surat berikutnya bila orang tua tidak hadir. */
export function nextLetterType(t: LetterType | null | undefined): LetterType {
  switch (t) {
    case "PANGGILAN_1":
      return "PANGGILAN_2";
    case "PANGGILAN_2":
      return "PANGGILAN_3";
    case "PANGGILAN_3":
      return "PERJANJIAN";
    default:
      return "PANGGILAN_1";
  }
}

export type LetterVarsInput = {
  letterNumber: string;
  parentName: string;
  studentName: string;
  className: string;
  meetingAt: Date;
  place: string;
  subject: string;
  bkName: string;
  principalName: string;
  principalNip: string;
};

export function letterVars(i: LetterVarsInput) {
  return {
    nomor_surat: i.letterNumber,
    nama_ortu: i.parentName,
    nama_siswa: i.studentName,
    kelas: i.className,
    hari_tanggal: formatLongDate(i.meetingAt),
    jam: formatTime(i.meetingAt),
    tempat: i.place,
    perihal: i.subject,
    nama_bk: i.bkName,
    nama_kepsek: i.principalName,
    nip_kepsek: i.principalNip,
  };
}

export function renderLetterBody(template: string, i: LetterVarsInput) {
  return renderTemplate(template, letterVars(i));
}

/** Inisial nama untuk halaman verifikasi publik (data minimal): "I Kadek Dharma Putra" → "I. K. D. P." */
export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + ".")
    .join(" ");
}
