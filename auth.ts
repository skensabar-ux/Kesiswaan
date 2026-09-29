import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { clearFailures, lockedMinutes, registerFailure } from "@/lib/rate-limit";
import { ipFromRequest } from "@/lib/request";
import type { AppRole } from "@/lib/roles";

class LockedError extends CredentialsSignin {
  code = "locked";
}

const staffSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });
const parentSchema = z.object({ nisn: z.string().trim().min(1), pin: z.string().trim().min(4) });

async function guard(keys: string[]) {
  for (const k of keys) if ((await lockedMinutes(k)) > 0) throw new LockedError();
}

async function logLogin(userId: string, ip: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({ data: { userId, action: "LOGIN", entity: "User", entityId: userId, ip } }),
  ]);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // Staf: username / NIP + password
    Credentials({
      id: "staff",
      credentials: { username: {}, password: {} },
      async authorize(raw, req) {
        const parsed = staffSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;
        const ip = ipFromRequest(req);
        const userKey = `u:${username.toLowerCase()}`;
        const ipKey = `ip:${ip}`;
        await guard([userKey, ipKey]);

        const user = await prisma.user.findUnique({ where: { username } });
        const ok =
          user && user.isActive && user.role !== "ORANG_TUA" && (await bcrypt.compare(password, user.passwordHash));
        if (!ok) {
          await registerFailure(userKey, 5);
          await registerFailure(ipKey, 30);
          return null;
        }
        await clearFailures(userKey);
        await logLogin(user.id, ip);
        return {
          id: user.id,
          name: user.name,
          role: user.role as AppRole,
          username: user.username,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
    // Orang tua: NISN anak + PIN
    Credentials({
      id: "parent",
      credentials: { nisn: {}, pin: {} },
      async authorize(raw, req) {
        const parsed = parentSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { nisn, pin } = parsed.data;
        const ip = ipFromRequest(req);
        const nisnKey = `n:${nisn}`;
        const ipKey = `ip:${ip}`;
        await guard([nisnKey, ipKey]);

        const student = await prisma.student.findUnique({
          where: { nisn },
          include: { parents: { include: { parent: { include: { user: true } } } } },
        });
        let matched: { id: string; name: string; username: string; mustChangePassword: boolean } | null = null;
        for (const sp of student?.parents ?? []) {
          const u = sp.parent.user;
          if (u && u.isActive && u.role === "ORANG_TUA" && (await bcrypt.compare(pin, u.passwordHash))) {
            matched = u;
            break;
          }
        }
        // bukan PIN? coba sebagai kode OTP (sekali pakai, berlaku 5 menit)
        if (!matched && student?.isActive) {
          const users = student.parents.map((sp) => sp.parent.user).filter((u): u is NonNullable<typeof u> => Boolean(u?.isActive));
          const otps = await prisma.otpCode.findMany({
            where: { userId: { in: users.map((u) => u.id) }, usedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
            take: 10,
          });
          for (const otp of otps) {
            if (await bcrypt.compare(pin, otp.codeHash)) {
              const used = await prisma.otpCode.updateMany({ where: { id: otp.id, usedAt: null }, data: { usedAt: new Date() } });
              if (used.count === 1) matched = users.find((u) => u.id === otp.userId) ?? null;
              break;
            }
          }
        }
        if (!matched) {
          await registerFailure(nisnKey, 5);
          await registerFailure(ipKey, 30);
          return null;
        }
        await clearFailures(nisnKey);
        await logLogin(matched.id, ip);
        return {
          id: matched.id,
          name: matched.name,
          role: "ORANG_TUA" as AppRole,
          username: matched.username,
          mustChangePassword: matched.mustChangePassword,
        };
      },
    }),
  ],
});
