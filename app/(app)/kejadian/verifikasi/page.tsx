import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { formatDateTime } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { IncidentActions } from "@/components/incident-actions";
import { PhotoGrid } from "@/components/photo-grid";
import { LevelBadge } from "@/components/level-badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Verifikasi Kejadian" };

export default async function Page() {
  await requirePageRole("ADMIN", "PKS");
  const rows = await prisma.incident.findMany({
    where: { status: "MENUNGGU_VERIFIKASI", deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      reporter: { select: { name: true } },
      students: { include: { student: { select: { name: true } } } },
      attachments: { select: { path: true } },
    },
  });
  return (
    <>
      <PageHeader title="Antrean Verifikasi" description={`${rows.length} laporan menunggu — terlama di atas.`} backHref="/kejadian" />
      {rows.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada laporan menunggu" description="Semua laporan dari guru sudah diproses." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const s0 = r.students[0];
            return (
              <Card key={r.id}>
                <CardContent className="flex flex-col gap-3 pt-4 md:pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/kejadian/${r.id}`} className="font-semibold hover:underline">
                        {[...new Set(r.students.map((s) => s.violationName))].join(", ")}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(r.occurredAt)} · {r.location}
                      </p>
                    </div>
                    {s0 && (
                      <div className="flex items-center gap-2">
                        <LevelBadge level={s0.level} />
                        <span className="font-semibold">+{s0.points} poin</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Siswa: </span>
                    {r.students.map((s) => `${s.student.name} (${s.className ?? "-"})`).join(", ")}
                  </p>
                  <p className="line-clamp-3 whitespace-pre-line text-sm">{r.chronology}</p>
                  <PhotoGrid paths={r.attachments.map((a) => a.path)} size="sm" />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground">Dilaporkan oleh {r.reporterName ?? r.reporter.name}</span>
                    <IncidentActions id={r.id} canVerify canDelete={false} size="sm" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
