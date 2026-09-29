/**
 * Definisi role, label, dan peta akses route.
 * File ini aman dipakai di middleware (edge), server, maupun client.
 */

export const ROLES = ["ADMIN", "PKS", "GURU", "WALI_KELAS", "BK", "KEPSEK", "ORANG_TUA"] as const;
export type AppRole = (typeof ROLES)[number];

export const ROLE_LABEL: Record<AppRole, string> = {
  ADMIN: "Administrator",
  PKS: "Kesiswaan (PKS)",
  GURU: "Guru",
  WALI_KELAS: "Wali Kelas",
  BK: "Guru BK",
  KEPSEK: "Kepala Sekolah",
  ORANG_TUA: "Orang Tua/Wali",
};

export const STAFF_ROLES: AppRole[] = ["ADMIN", "PKS", "GURU", "WALI_KELAS", "BK", "KEPSEK"];

/** Role yang boleh melaporkan kejadian. */
export const REPORTER_ROLES: AppRole[] = ["ADMIN", "PKS", "GURU", "WALI_KELAS", "BK"];

/**
 * Aturan akses per prefix route (dicek berurutan, prefix terpanjang dulu).
 * Pengecekan ini hanya lapis pertama — setiap server action / route handler
 * tetap memanggil requireRole() dan memeriksa cakupan data.
 */
type RouteRule = { prefix: string; roles: AppRole[] };

export const ROUTE_RULES: RouteRule[] = (
  [
  { prefix: "/master", roles: ["ADMIN"] },
  { prefix: "/pengaturan", roles: ["ADMIN"] },
  { prefix: "/audit", roles: ["ADMIN", "KEPSEK"] },
  { prefix: "/kejadian/verifikasi", roles: ["ADMIN", "PKS"] },
  { prefix: "/kejadian", roles: STAFF_ROLES },
  { prefix: "/siswa", roles: ["ADMIN", "PKS", "WALI_KELAS", "BK", "KEPSEK"] },
  { prefix: "/kelas", roles: ["ADMIN", "PKS", "WALI_KELAS", "BK", "KEPSEK"] },
  { prefix: "/bk", roles: ["ADMIN", "PKS", "BK", "KEPSEK"] },
  { prefix: "/laporan", roles: ["ADMIN", "PKS", "BK", "KEPSEK"] },
  { prefix: "/ortu", roles: ["ORANG_TUA"] },
  { prefix: "/notifikasi", roles: [...ROLES] },
  { prefix: "/ganti-password", roles: [...ROLES] },
  { prefix: "/", roles: STAFF_ROLES },
  ] satisfies RouteRule[]
).sort((a, b) => b.prefix.length - a.prefix.length);

/** Route publik (tanpa login). */
export const PUBLIC_PREFIXES = ["/login", "/verifikasi", "/api/auth", "/api/cron", "/api/public"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function canAccessPath(role: AppRole, pathname: string) {
  const rule = ROUTE_RULES.find((r) =>
    r.prefix === "/" ? true : pathname === r.prefix || pathname.startsWith(r.prefix + "/"),
  );
  return rule ? rule.roles.includes(role) : false;
}

export function homePathFor(role: AppRole) {
  return role === "ORANG_TUA" ? "/ortu" : "/";
}
