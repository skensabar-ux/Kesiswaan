"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { normalizeWa } from "@/lib/phone";
import { randomPassword } from "@/lib/secrets";
import { userSchema } from "@/lib/validators/master";

/** Simpan akun staf. Bila password kosong saat membuat akun, dibuatkan password sementara (ditampilkan sekali). */
export async function saveUser(id: string | null, input: z.infer<typeof userSchema>): Promise<ActionResult<{ password?: string }>> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const d = userSchema.parse(input);
    if (d.password && d.password.length < 8) throw new UserError("Password minimal 8 karakter.");
    if (id === me.id && (d.role !== "ADMIN" || !d.isActive)) {
      throw new UserError("Anda tidak dapat menurunkan role atau menonaktifkan akun sendiri.");
    }
    const before = id ? await prisma.user.findUnique({ where: { id }, include: { teacher: true } }) : null;
    if (id && (!before || before.role === "ORANG_TUA")) throw new UserError("Akun tidak ditemukan.");

    let generated: string | undefined;
    const saved = await prisma.$transaction(async (tx) => {
      const base = { name: d.name, username: d.username, role: d.role, phone: normalizeWa(d.phone), isActive: d.isActive };
      let user;
      if (id) {
        user = await tx.user.update({ where: { id }, data: base });
      } else {
        const pwd = d.password || (generated = randomPassword());
        user = await tx.user.create({ data: { ...base, passwordHash: await bcrypt.hash(pwd, 10), mustChangePassword: true } });
      }
      // tautan ke data guru
      const teacherId = d.teacherId || null;
      if (before?.teacher && before.teacher.id !== teacherId) {
        await tx.teacher.update({ where: { id: before.teacher.id }, data: { userId: null } });
      }
      if (teacherId) {
        const t = await tx.teacher.findUniqueOrThrow({ where: { id: teacherId } });
        if (t.userId && t.userId !== user.id) throw new UserError(`Guru ${t.name} sudah tertaut ke akun lain.`);
        await tx.teacher.update({ where: { id: teacherId }, data: { userId: user.id } });
      }
      return user;
    });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "User", entityId: saved.id, before, after: saved });
    revalidatePath("/master/pengguna");
    return {
      ok: true,
      message: generated ? "Akun dibuat." : "Akun disimpan.",
      data: generated ? { password: generated } : undefined,
    };
  });
}

export async function resetUserPassword(id: string): Promise<ActionResult<{ password: string }>> {
  return runAction(async () => {
    const me = await requireRole("ADMIN");
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (user.role === "ORANG_TUA") throw new UserError("Gunakan menu Orang Tua untuk reset PIN.");
    const password = randomPassword();
    await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true } });
    await prisma.loginAttempt.deleteMany({ where: { key: `u:${user.username.toLowerCase()}` } });
    await audit({ userId: me.id, action: "RESET_PASSWORD", entity: "User", entityId: id });
    return { ok: true, message: "Password sementara dibuat.", data: { password } };
  });
}
