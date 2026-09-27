import type { NextAuthConfig } from "next-auth";
import type { AppRole } from "@/lib/roles";

/**
 * Konfigurasi Auth.js yang aman untuk edge (dipakai middleware).
 * Provider Credentials (butuh Prisma & bcrypt) didefinisikan di auth.ts.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.username = user.username;
        token.mustChangePassword = user.mustChangePassword;
      }
      if (trigger === "update" && session && typeof session.mustChangePassword === "boolean") {
        token.mustChangePassword = session.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as AppRole;
      session.user.username = token.username as string;
      session.user.mustChangePassword = Boolean(token.mustChangePassword);
      return session;
    },
  },
} satisfies NextAuthConfig;
