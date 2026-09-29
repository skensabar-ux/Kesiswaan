import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { canAccessPath, homePathFor, isPublicPath } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const user = req.auth?.user;
  const isApi = pathname.startsWith("/api/");

  if (!user) {
    if (isApi) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  if (isApi) return NextResponse.next(); // route handler memeriksa hak akses sendiri

  if (!canAccessPath(user.role, pathname)) {
    return NextResponse.redirect(new URL(homePathFor(user.role), req.nextUrl));
  }
  // Kewajiban ganti password & status aktif dicek di layout (dari database), bukan dari token:
  // cookie sesi bisa tertimpa token lama oleh request yang sedang berjalan.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
