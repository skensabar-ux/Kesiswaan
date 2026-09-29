import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Jam wajib diisi");

export const letterSchema = z.object({
  caseId: z.string().min(1),
  templateId: z.string().min(1, "Pilih template surat"),
  meetingDate: date,
  meetingTime: time,
  place: z.string().trim().min(2, "Tempat wajib diisi").max(191),
  subject: z.string().trim().min(3, "Perihal wajib diisi").max(191),
  parentName: z.string().trim().min(2, "Nama orang tua wajib diisi").max(191),
});
export type LetterInput = z.infer<typeof letterSchema>;

export const rescheduleSchema = z.object({ meetingDate: date, meetingTime: time, place: z.string().trim().min(2).max(191) });

export const sessionScheduleSchema = z.object({
  caseId: z.string().min(1),
  date,
  time,
  type: z.enum(["KONSELING_INDIVIDU", "KONSELING_KELOMPOK", "HOME_VISIT", "MEDIASI", "KONFERENSI_KASUS"]),
  place: z.string().trim().max(191).optional().or(z.literal("")),
});
export type SessionScheduleInput = z.infer<typeof sessionScheduleSchema>;

export const sessionRecordSchema = z.object({
  attendees: z.string().trim().min(2, "Isi pihak yang hadir").max(1000),
  problem: z.string().trim().min(5, "Isi permasalahan").max(5000),
  result: z.string().trim().min(5, "Isi hasil/kesepakatan").max(5000),
  followUpPlan: z.string().trim().max(3000).optional().or(z.literal("")),
});
export type SessionRecordInput = z.infer<typeof sessionRecordSchema>;

export const manualCaseSchema = z.object({
  studentId: z.string().min(1, "Pilih siswa"),
  title: z.string().trim().min(5, "Uraikan masalah (min. 5 karakter)").max(191),
  priority: z.enum(["RENDAH", "SEDANG", "TINGGI"]),
});

export const SESSION_TYPE_LABEL = {
  KONSELING_INDIVIDU: "Konseling individu",
  KONSELING_KELOMPOK: "Konseling kelompok",
  HOME_VISIT: "Home visit",
  MEDIASI: "Mediasi",
  KONFERENSI_KASUS: "Konferensi kasus",
} as const;
