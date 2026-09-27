import "server-only";
import type { SessionUser } from "@/lib/rbac";

/**
 * Aturan akses file non-publik. Diperluas per modul:
 * - Tahap 2: lampiran kejadian (incidents/*) mengikuti hak lihat kejadian
 * - Tahap 4: lampiran konseling (counseling/*) hanya BK (& Kepsek bila diizinkan)
 */
export async function canReadUpload(user: SessionUser, rel: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  void rel;
  return false;
}
