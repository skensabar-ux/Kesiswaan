import Link from "next/link";
import { CalendarRange, ClipboardCheck, ClipboardList, GraduationCap, Plus, ShieldAlert } from "lucide-react";
import { requirePageRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { incidentScope } from "@/lib/incident-access";
import { getActiveAcademicYear } from "@/lib/settings";
import { REPORTER_ROLES, ROLE_LABEL, STAFF_ROLES } from "@/lib/roles";
import { formatLongDate, startOfWitaDay } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePageRole(...STAFF_ROLES);
  const scope = await incidentScope(user);
  const today = startOfWitaDay();
  // minggu dimulai Senin (WITA)
  const weekStart = new Date(today.getTime() - ((new Date(today.getTime() + 8 * 3600_000).getUTCDay() + 6) % 7) * 86_400_000);
  const base = { AND: [scope, { deletedAt: null, status: { not: "DITOLAK" as const } }] };
  const isVerifier = user.role === "PKS" || user.role === "ADMIN";

  const [year, students, todayCount, weekCount, pending, openCases] = await Promise.all([
    getActiveAcademicYear(),
    prisma.student.count({ where: { isActive: true } }),
    prisma.incident.count({ where: { ...base, occurredAt: { gte: today } } }),
    prisma.incident.count({ where: { ...base, occurredAt: { gte: weekStart } } }),
    isVerifier ? prisma.incident.count({ where: { status: "MENUNGGU_VERIFIKASI", deletedAt: null } }) : Promise.resolve(0),
    ["ADMIN", "PKS", "BK", "KEPSEK"].includes(user.role)
      ? prisma.case.count({ where: { status: { notIn: ["SELESAI", "DIRUJUK"] } } })
      : Promise.resolve(null),
  ]);

  const stats = [
    { label: "Kejadian hari ini", value: todayCount, icon: ClipboardList, href: "/kejadian" },
    { label: "Kejadian minggu ini", value: weekCount, icon: CalendarRange, href: "/kejadian" },
    ...(isVerifier ? [{ label: "Menunggu verifikasi", value: pending, icon: ClipboardCheck, href: "/kejadian/verifikasi" }] : []),
    ...(openCases !== null ? [{ label: "Kasus BK aktif", value: openCases, icon: ShieldAlert, href: "/bk/kasus" }] : []),
    ...(user.role === "ADMIN" ? [{ label: "Siswa aktif", value: students, icon: GraduationCap, href: "/master/siswa" }] : []),
  ].slice(0, 4);

  return (
    <>
      <PageHeader
        title={`Halo, ${user.name.split(" ")[0]}`}
        description={`${ROLE_LABEL[user.role]} · ${formatLongDate(new Date())}`}
        actions={
          REPORTER_ROLES.includes(user.role) && (
            <Button asChild size="lg">
              <Link href="/kejadian/baru">
                <Plus /> Catat Kejadian
              </Link>
            </Button>
          )
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-3 pt-4 md:pt-5">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none tabular-nums">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="size-4" /> Tahun Ajaran Aktif
          </CardTitle>
          <CardDescription>
            {year ? `${year.name} — Semester ${year.semester === "GANJIL" ? "Ganjil" : "Genap"}` : "Belum ada tahun ajaran aktif."}
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
