"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { changePasswordSchema } from "@/lib/validators/auth";

function safeCallback(url: unknown) {
  const s = typeof url === "string" ? url : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function loginStaff(_: unknown, formData: FormData): Promise<ActionResult> {
  try {
    const username = String(formData.get("username") ?? "").trim();
    // Hanya dipakai untuk tujuan redirect setelah kredensial terverifikasi oleh signIn().
    const pending = await prisma.user.findUnique({ where: { username }, select: { mustChangePassword: true } });
    await signIn("staff", {
      username,
      password: formData.get("password"),
      redirectTo: pending?.mustChangePassword ? "/ganti-password" : safeCallback(formData.get("callbackUrl")),
    });
    return { ok: true };
  } catch (e) {
    return authErrorResult(e, "Username/NIP atau password salah.");
  }
}

export async function loginParent(_: unknown, formData: FormData): Promise<ActionResult> {
  try {
    await signIn("parent", { nisn: formData.get("nisn"), pin: formData.get("pin"), redirectTo: "/ortu" });
    return { ok: true };
  } catch (e) {
    return authErrorResult(e, "NISN atau PIN salah.");
  }
}

function authErrorResult(e: unknown, fallback: string): ActionResult {
  if (e instanceof AuthError) {
    const code = (e as AuthError & { code?: string }).code;
    if (code === "locked") return { ok: false, error: "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit." };
    return { ok: false, error: fallback };
  }
  throw e; // NEXT_REDIRECT saat sukses
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function changePassword(input: z.infer<typeof changePasswordSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole();
    const data = changePasswordSchema.parse(input);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
      throw new UserError("Password/PIN lama tidak sesuai.");
    }
    if (user.role === "ORANG_TUA" && !/^\d{6}$/.test(data.newPassword)) {
      throw new UserError("PIN harus 6 digit angka.");
    }
    if (user.role !== "ORANG_TUA" && data.newPassword.length < 8) {
      throw new UserError("Password minimal 8 karakter.");
    }
    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: await bcrypt.hash(data.newPassword, 10), mustChangePassword: false },
    });
    await audit({ userId: me.id, action: "CHANGE_PASSWORD", entity: "User", entityId: me.id });
    await unstable_update({ user: {}, mustChangePassword: false } as never);
    return { ok: true, message: "Password berhasil diganti." };
  });
}
