import "server-only";
import { prisma } from "@/lib/prisma";
import { incidentScope } from "@/lib/incident-access";
import type { SessionUser } from "@/lib/rbac";
import { canReadCounseling } from "@/lib/bk-access";

/**
 * Aturan akses file non-publik:
 * - counseling/*: rahasia — hanya BK (& Kepsek bila diizinkan); ADMIN pun tidak
 * - incidents/*: mengikuti hak lihat kejadian
 */
export async function canReadUpload(user: SessionUser, rel: string): Promise<boolean> {
  if (rel.startsWith("counseling/")) {
    if (!(await canReadCounseling(user))) return false;
    return Boolean(await prisma.counselingAttachment.findFirst({ where: { path: rel }, select: { id: true } }));
  }
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
