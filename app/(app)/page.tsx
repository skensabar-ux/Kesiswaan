import Link from "next/link";
import { CalendarRange, GraduationCap, School, ShieldAlert, Users } from "lucide-react";
import { requirePageRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getActiveAcademicYear } from "@/lib/settings";
import { ROLE_LABEL, STAFF_ROLES } from "@/lib/roles";
import { formatLongDate } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePageRole(...STAFF_ROLES);
  const [year, students, classes, teachers, types] = await Promise.all([
    getActiveAcademicYear(),
    prisma.student.count({ where: { isActive: true } }),
    prisma.class.count({ where: { academicYear: { isActive: true } } }),
    prisma.teacher.count({ where: { isActive: true } }),
    prisma.violationType.count({ where: { isActive: true } }),
  ]);

  const stats = [
    { label: "Siswa aktif", value: students, icon: GraduationCap, href: "/master/siswa" },
    { label: "Kelas (TA aktif)", value: classes, icon: School, href: "/master/kelas" },
    { label: "Guru aktif", value: teachers, icon: Users, href: "/master/guru" },
    { label: "Jenis pelanggaran", value: types, icon: ShieldAlert, href: "/master/jenis-pelanggaran" },
  ];

  return (
    <>
      <PageHeader
        title={`Halo, ${user.name.split(" ")[0]}`}
        description={`${ROLE_LABEL[user.role]} · ${formatLongDate(new Date())}`}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-3 pt-4 md:pt-5">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
          return user.role === "ADMIN" ? (
            <Link key={s.label} href={s.href}>
              {body}
            </Link>
          ) : (
            <div key={s.label}>{body}</div>
          );
        })}
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
