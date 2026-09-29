import "server-only";
import { prisma } from "@/lib/prisma";
import { incidentScope } from "@/lib/incident-access";
import type { SessionUser } from "@/lib/rbac";

/**
 * Aturan akses file non-publik:
 * - incidents/*: mengikuti hak lihat kejadian
 * - counseling/*: ditambahkan di Tahap 4 (hanya BK, & Kepsek bila diizinkan)
 */
export async function canReadUpload(user: SessionUser, rel: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (rel.startsWith("incidents/")) {
    const att = await prisma.incidentAttachment.findFirst({ where: { path: rel }, select: { incidentId: true } });
    if (!att) return false;
    const scope = await incidentScope(user);
    const found = await prisma.incident.findFirst({ where: { AND: [{ id: att.incidentId, deletedAt: null }, scope] }, select: { id: true } });
    return Boolean(found);
  }
  return false;
}
