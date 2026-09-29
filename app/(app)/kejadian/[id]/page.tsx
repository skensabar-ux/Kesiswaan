import Link from "next/link";
import { notFound } from "next/navigation";
import { homeroomClassIds, requirePageRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { FollowUpNotes } from "@/components/follow-up-notes";
import { findVisibleIncident } from "@/lib/incident-access";
import { formatDateTime } from "@/lib/date";
import { STAFF_ROLES } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { IncidentActions } from "@/components/incident-actions";
import { PhotoGrid } from "@/components/photo-grid";
import { CaseStatusBadge, IncidentStatusBadge } from "@/components/status-badges";
import { LevelBadge } from "@/components/level-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Detail Kejadian" };

const PROFILE_ROLES = ["ADMIN", "PKS", "WALI_KELAS", "BK", "KEPSEK"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(...STAFF_ROLES);
  const { id } = await params;
  const inc = await findVisibleIncident(user, id, {
    reporter: { select: { name: true } },
    verifiedBy: { select: { name: true } },
    students: { include: { student: { select: { id: true, name: true, nisn: true, classId: true } } }, orderBy: { student: { name: "asc" } } },
    attachments: { orderBy: { createdAt: "asc" } },
    cases: { include: { case: { select: { id: true, status: true, title: true, student: { select: { name: true } } } } } },
  });
  if (!inc) notFound();

  const isVerifier = user.role === "PKS" || user.role === "ADMIN";
  const canVerify = isVerifier && inc.status === "MENUNGGU_VERIFIKASI";
  const canDelete = isVerifier || (inc.reporterId === user.id && inc.status === "MENUNGGU_VERIFIKASI");
  const canOpenProfile = PROFILE_ROLES.includes(user.role);
  const violations = [...new Set(inc.students.map((s) => s.violationName))];
  const noteRoles = ["ADMIN", "PKS", "WALI_KELAS", "BK"];
  const myClasses = user.role === "WALI_KELAS" ? await homeroomClassIds(user.id) : null;
  const noteStudents = inc.students
    .filter((s) => !myClasses || (s.student.classId && myClasses.includes(s.student.classId)))
    .map((s) => ({ id: s.student.id, name: s.student.name }));
  const notes = noteRoles.includes(user.role)
    ? await prisma.followUpNote.findMany({
        where: { incidentId: inc.id, ...(myClasses ? { studentId: { in: noteStudents.map((s) => s.id) } } : {}) },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } }, student: { select: { name: true } } },
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={violations.join(", ")}
        description={formatDateTime(inc.occurredAt)}
        backHref="/kejadian"
        actions={<IncidentActions id={inc.id} canVerify={canVerify} canDelete={canDelete} />}
      />
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4 md:pt-5">
            <dl className="flex flex-col gap-3">
              <Row label="Status">
                <IncidentStatusBadge status={inc.status} />
                {inc.status === "DITOLAK" && inc.rejectionReason && <p className="mt-1 text-destructive">Alasan: {inc.rejectionReason}</p>}
              </Row>
              <Row label="Lokasi">{inc.location}</Row>
              <Row label="Kronologi">
                <p className="whitespace-pre-line">{inc.chronology}</p>
              </Row>
              {inc.initialAction && <Row label="Tindakan awal">{inc.initialAction}</Row>}
              <Row label="Pelapor">
                {inc.reporterName ? `${inc.reporterName} (dicatat oleh ${inc.reporter.name})` : inc.reporter.name}
              </Row>
              {inc.witnesses && <Row label="Saksi">{inc.witnesses}</Row>}
              {inc.verifiedBy && inc.status !== "MENUNGGU_VERIFIKASI" && (
                <Row label={inc.status === "DITOLAK" ? "Ditolak oleh" : "Diverifikasi oleh"}>
                  {inc.verifiedBy.name} · {formatDateTime(inc.verifiedAt)}
                </Row>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Siswa terlibat ({inc.students.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-0">
            <ul className="divide-y">
              {inc.students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0">
                    {canOpenProfile ? (
                      <Link href={`/siswa/${s.student.id}`} className="font-medium hover:underline">
                        {s.student.name}
                      </Link>
                    ) : (
                      <p className="font-medium">{s.student.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {s.className ?? "-"} · NISN {s.student.nisn}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <LevelBadge level={s.level} />
                    <span className="font-semibold tabular-nums">+{s.points}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {inc.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bukti foto</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGrid paths={inc.attachments.map((a) => a.path)} />
            </CardContent>
          </Card>
        )}

        {noteRoles.includes(user.role) && inc.status === "TERVERIFIKASI" && (
          <Card>
            <CardHeader>
              <CardTitle>Tindak lanjut</CardTitle>
            </CardHeader>
            <CardContent>
              <FollowUpNotes
                incidentId={inc.id}
                canAdd
                students={noteStudents}
                notes={notes.map((n) => ({
                  id: n.id,
                  note: n.note,
                  author: n.author.name,
                  createdAt: n.createdAt.toISOString(),
                  studentName: inc.students.length > 1 ? n.student.name : undefined,
                }))}
              />
            </CardContent>
          </Card>
        )}

        {inc.cases.length > 0 && ["ADMIN", "PKS", "BK", "KEPSEK", "WALI_KELAS"].includes(user.role) && (
          <Card>
            <CardHeader>
              <CardTitle>Kasus BK terkait</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {inc.cases.map(({ case: c }) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <span>
                    <b>{c.student.name}</b> — {c.title}
                  </span>
                  <CaseStatusBadge status={c.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
