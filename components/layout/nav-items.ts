import {
  BarChart3,
  BookUser,
  ListChecks,
  ClipboardCheck,
  ClipboardList,
  Contact,
  CalendarRange,
  FileText,
  GraduationCap,
  CalendarDays,
  HeartHandshake,
  Mail,
  LayoutDashboard,
  MessageCircle,
  Scale,
  School,
  Settings,
  ShieldAlert,
  Upload,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/roles";

export type NavItem = { href: string; label: string; icon: LucideIcon; roles: AppRole[]; mobile?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };

const STAFF: AppRole[] = ["ADMIN", "PKS", "GURU", "WALI_KELAS", "BK", "KEPSEK"];

export const NAV: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: STAFF, mobile: true },
      { href: "/ortu", label: "Beranda", icon: LayoutDashboard, roles: ["ORANG_TUA"], mobile: true },
    ],
  },
  {
    label: "Kesiswaan",
    items: [
      { href: "/kejadian", label: "Kejadian", icon: ClipboardList, roles: STAFF, mobile: true },
      { href: "/kejadian/verifikasi", label: "Verifikasi", icon: ClipboardCheck, roles: ["ADMIN", "PKS"], mobile: true },
      { href: "/siswa", label: "Siswa", icon: Contact, roles: ["ADMIN", "PKS", "WALI_KELAS", "BK", "KEPSEK"], mobile: true },
      { href: "/kelas", label: "Kelas", icon: School, roles: ["ADMIN", "PKS", "WALI_KELAS", "BK", "KEPSEK"], mobile: true },
      { href: "/laporan", label: "Laporan", icon: BarChart3, roles: ["ADMIN", "PKS", "BK", "KEPSEK"] },
    ],
  },
  {
    label: "Bimbingan Konseling",
    items: [
      { href: "/bk/kasus", label: "Kasus BK", icon: HeartHandshake, roles: ["ADMIN", "PKS", "BK", "KEPSEK"] },
      { href: "/bk/surat", label: "Surat", icon: Mail, roles: ["ADMIN", "PKS", "BK", "KEPSEK"] },
      { href: "/bk/kalender", label: "Kalender", icon: CalendarDays, roles: ["ADMIN", "BK", "KEPSEK"] },
    ],
  },
  {
    label: "Master Data",
    items: [
      { href: "/master/siswa", label: "Data Siswa", icon: GraduationCap, roles: ["ADMIN"] },
      { href: "/master/ortu", label: "Orang Tua", icon: BookUser, roles: ["ADMIN"] },
      { href: "/master/kelas", label: "Data Kelas", icon: School, roles: ["ADMIN"] },
      { href: "/master/guru", label: "Guru", icon: Users, roles: ["ADMIN"] },
      { href: "/master/tahun-ajaran", label: "Tahun Ajaran", icon: CalendarRange, roles: ["ADMIN"] },
      { href: "/master/jenis-pelanggaran", label: "Jenis Pelanggaran", icon: ShieldAlert, roles: ["ADMIN"] },
      { href: "/master/ambang-sanksi", label: "Ambang Sanksi", icon: Scale, roles: ["ADMIN"] },
      { href: "/master/template-surat", label: "Template Surat", icon: FileText, roles: ["ADMIN"] },
      { href: "/master/import", label: "Import Excel", icon: Upload, roles: ["ADMIN"] },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/master/pengguna", label: "Pengguna", icon: UserCog, roles: ["ADMIN"] },
      { href: "/pengaturan", label: "Pengaturan", icon: Settings, roles: ["ADMIN"] },
      { href: "/pengaturan/wa", label: "Log WhatsApp", icon: MessageCircle, roles: ["ADMIN"] },
      { href: "/audit", label: "Audit Log", icon: ListChecks, roles: ["ADMIN", "KEPSEK"] },
    ],
  },
];

/** Menu bawah (HP) per role: maks 4 item yang paling sering dipakai; sisanya di "Menu". */
export const MOBILE_ORDER: Record<AppRole, string[]> = {
  ADMIN: ["/", "/kejadian", "/siswa", "/bk/kasus"],
  PKS: ["/", "/kejadian", "/kejadian/verifikasi", "/siswa"],
  GURU: ["/", "/kejadian"],
  WALI_KELAS: ["/", "/kejadian", "/kelas", "/siswa"],
  BK: ["/", "/bk/kasus", "/bk/kalender", "/siswa"],
  KEPSEK: ["/", "/bk/kasus", "/siswa", "/bk/surat"],
  ORANG_TUA: ["/ortu"],
};

export function mobileItemsFor(role: AppRole): NavItem[] {
  const all = navFor(role).flatMap((g) => g.items);
  return MOBILE_ORDER[role].map((href) => all.find((i) => i.href === href)).filter((i): i is NavItem => Boolean(i));
}

export function navFor(role: AppRole): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length);
}

export function isActive(pathname: string, href: string) {
  if (href === "/" || href === "/ortu") return pathname === href;
  if (href === "/kejadian" && pathname.startsWith("/kejadian/verifikasi")) return false;
  if (href === "/pengaturan" && pathname.startsWith("/pengaturan/wa")) return false;
  return pathname === href || pathname.startsWith(href + "/");
}
