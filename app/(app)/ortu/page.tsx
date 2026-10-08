import Link from "next/link";
import { ChevronRight, FileWarning } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { getActiveAcademicYear } from "@/lib/settings";
import { loadThresholds, pointsForStudents } from "@/lib/points-db";
import { nextThreshold, statusColor } from "@/lib/points";
import { formatLongDate, formatTime } from "@/lib/date";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { EmptyState } from "@/components/empty-state";
import { PointsBadge } from "@/components/status-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Portal Orang Tua" };

export default async function OrtuPage() {
  const user = await requirePageRole("ORANG_TUA");
  const [children, year, thresholds] = await Promise.all([
    prisma.student.findMany({
      where: { parents: { some: { parent: { userId: user.id } } } },
      include: { class: { select: { name: true, waliKelas: { select: { name: true } } } } },
      orderBy: { name: "asc" },
    }),
    getActiveAcademicYear(),
    loadThresholds(),
  ]);
  const ids = children.map((c) => c.id);
  const [points, letters] = await Promise.all([
    year ? pointsForStudents(ids, year.id) : Promise.resolve(new Map<string, number>()),
    prisma.summonsLetter.findMany({
      where: { case: { studentId: { in: ids } }, deletedAt: null, status: { in: ["TERKIRIM", "JADWAL_ULANG"] }, meetingAt: { gte: new Date() } },
      orderBy: { meetingAt: "asc" },
      include: { case: { select: { student: { select: { name: true } } } } },
    }),
  ]);

  return (
    <>
      <WelcomeBanner
        name={user.name.split(",")[0]!.trim()}
        roleLabel="Portal orang tua / wali murid"
        dateLabel={formatLongDate(new Date())}
        yearLabel={year ? `TA ${year.name}` : "Belum ada tahun ajaran aktif"}
      />
      {letters.length > 0 && (
        <div className="stagger mb-4 flex flex-col gap-2">
          {letters.map((l) => (
            <Link key={l.id} href={`/konfirmasi/${l.responseToken}`}>
              <Card className="border-warning/50 bg-warning/10 transition-colors hover:border-warning">
                <CardContent className="flex items-center gap-3 pt-4 md:pt-5">
                  <FileWarning className="size-6 shrink-0 text-amber-600 dark:text-warning" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">
                      {LETTER_TYPE_LABEL[l.type]} — {l.case.student.name}
                    </p>
                    <p className="text-muted-foreground">
                      {formatLongDate(l.meetingAt)} pukul {formatTime(l.meetingAt)} WITA · {l.place}
                    </p>
                    <p className="font-medium text-primary">Mohon konfirmasi kehadiran →</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {children.length === 0 ? (
        <Card>
          <EmptyState title="Data anak belum tertaut" description="Hubungi sekolah untuk menautkan akun Anda." />
        </Card>
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {children.map((s) => {
            const p = points.get(s.id) ?? 0;
            const next = nextThreshold(thresholds, p);
            return (
              <Link key={s.id} href={`/ortu/anak/${s.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle>{s.name}</CardTitle>
                      <CardDescription>
                        {s.class?.name ?? "Tanpa kelas"} · Wali kelas {s.class?.waliKelas?.name ?? "-"}
                      </CardDescription>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="flex items-center gap-3 text-sm">
                    <PointsBadge points={p} color={statusColor(thresholds, p)} className="px-3 py-1 text-base" />
                    <span className="text-muted-foreground">
                      poin pelanggaran{next ? ` · batas pembinaan berikutnya ${next.minPoints}` : ""}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
