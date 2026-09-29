import {
  BookUser,
  ClipboardCheck,
  ClipboardList,
  Contact,
  CalendarRange,
  FileText,
  GraduationCap,
  LayoutDashboard,
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
    ],
  },
];

export function navFor(role: AppRole): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length);
}

export function isActive(pathname: string, href: string) {
  if (href === "/" || href === "/ortu") return pathname === href;
  if (href === "/kejadian" && pathname.startsWith("/kejadian/verifikasi")) return false;
  return pathname === href || pathname.startsWith(href + "/");
}
