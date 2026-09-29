import "server-only";
import type { SessionUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";

/** Boleh melihat daftar & status kasus. */
export const CASE_VIEW_ROLES = ["ADMIN", "PKS", "BK", "KEPSEK"] as const;
/** Boleh mengelola kasus & surat. */
export const CASE_MANAGE_ROLES = ["ADMIN", "BK"] as const;

/** Catatan konseling rahasia: hanya BK, dan Kepala Sekolah bila diizinkan di Pengaturan. */
export async function canReadCounseling(user: SessionUser) {
  if (user.role === "BK") return true;
  if (user.role === "KEPSEK") return (await getSettings()).kepsekCanReadCounseling;
  return false;
}
