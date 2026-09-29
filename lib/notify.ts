import "server-only";
import type { Prisma, Role } from "@prisma/client";

type Tx = Prisma.TransactionClient;
export type NotificationInput = { title: string; body: string; link?: string };

/** Buat notifikasi in-app untuk sekumpulan user (duplikat diabaikan). */
export async function notifyUsers(tx: Tx, userIds: Iterable<string>, n: NotificationInput) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return 0;
  await tx.notification.createMany({ data: ids.map((userId) => ({ userId, title: n.title, body: n.body, link: n.link ?? null })) });
  return ids.length;
}

/** User aktif dengan role tertentu. */
export async function userIdsByRoles(tx: Tx, roles: Role[]) {
  if (roles.length === 0) return [];
  const rows = await tx.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Akun wali kelas dari kelas siswa (bila ada & aktif). */
export async function homeroomUserId(tx: Tx, classId: string | null | undefined) {
  if (!classId) return null;
  const c = await tx.class.findUnique({ where: { id: classId }, select: { waliKelas: { select: { user: { select: { id: true, isActive: true } } } } } });
  const u = c?.waliKelas?.user;
  return u?.isActive ? u.id : null;
}
