import "server-only";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomPin } from "@/lib/secrets";

type Tx = Prisma.TransactionClient;

/** Pastikan orang tua punya akun portal; bila belum, dibuat dengan PIN acak. Mengembalikan userId. */
export async function ensureParentUser(tx: Tx, parent: { id: string; name: string; waNumber: string | null; userId: string | null }) {
  if (parent.userId) return parent.userId;
  const user = await tx.user.create({
    data: { name: parent.name, username: `ortu.${parent.id}`, passwordHash: await bcrypt.hash(randomPin(12), 10), role: "ORANG_TUA", phone: parent.waNumber },
  });
  await tx.parent.update({ where: { id: parent.id }, data: { userId: user.id } });
  return user.id;
}

/** Set PIN 6 digit baru (akun dibuat bila belum ada). PIN hanya dikembalikan sekali. */
export async function issueParentPin(tx: Tx, parent: { id: string; name: string; waNumber: string | null; userId: string | null }) {
  const pin = randomPin(6);
  const userId = await ensureParentUser(tx, parent);
  await tx.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(pin, 10), isActive: true, mustChangePassword: false } });
  return pin;
}
