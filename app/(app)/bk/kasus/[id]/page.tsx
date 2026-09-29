import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck2, CheckCircle2, FileText, Flag, Lock, MessageSquareReply, ShieldAlert, ShieldCheck, UserCheck, UserX, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { canReadCounseling } from "@/lib/bk-access";
import { formatDateTime, formatShortDate, formatTime, toDateInput } from "@/lib/date";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { LETTER_STATUS_LABEL, nextLetterType } from "@/lib/letter";
import { SESSION_TYPE_LABEL } from "@/lib/validators/bk";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { CaseStatusBadge } from "@/components/status-badges";
import { PhotoGrid } from "@/components/photo-grid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CancelSessionButton, CaseActions, LetterDialog, RecordSessionDialog, ScheduleSessionDialog } from "../../components";

export const metadata = { title: "Detail Kasus" };

type Event = { at: Date; icon: React.ElementType; tone?: "good" | "bad" | "warn"; title: React.ReactNode; body?: React.ReactNode };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole("ADMIN", "PKS", "BK", "KEPSEK");
  const { id } = await params;
  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      student: { include: { class: { include: { waliKelas: { select: { name: true } } } }, parents: { include: { parent: true }, orderBy: { isPrimary: "desc" } } } },
      assignedBk: { select: { name: true } },
      approvedBy: { select: { name: true } },
      threshold: { select: { minPoints: true, action: true, templateId: true } },
      incidents: {
        include: { incident: { include: { students: { where: { student: { cases: { some: { id } } } }, select: { violationName: true, points: true, studentId: true } } } } },
      },
      letters: { orderBy: { createdAt: "asc" } },
      sessions: { orderBy: { scheduledAt: "asc" }, include: { counselor: { select: { name: true } }, attachments: { select: { path: true } } } },
    },
  });
  if (!c) notFound();

  const canManage = user.role === "ADMIN" || user.role === "BK";
  const isBk = user.role === "BK";
  const canRead = await canReadCounseling(user);
  const open = !["SELESAI", "DIRUJUK"].includes(c.status);
  const activeLetters = c.letters.filter((l) => !l.deletedAt);
  const last = activeLetters.at(-1);
  const templates = await prisma.letterTemplate.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, type: true } });
  const suggestedType = last ? nextLetterType(last.type) : null;
  const defaultTemplateId =
    (suggestedType && templates.find((t) => t.type === suggestedType)?.id) || c.threshold?.templateId || templates.find((t) => t.type === "PANGGILAN_1")?.id || templates[0]?.id || "";
  const parentNames = c.student.parents.map(({ parent }) => parent.name);

  // ── timeline
  const events: Event[] = [{ at: c.openedAt, icon: Flag, title: "Kasus dibuka", body: c.title }];
  for (const { incident: inc } of c.incidents) {
    if (inc.deletedAt) continue;
    const mine = inc.students.filter((s) => s.studentId === c.studentId);
    events.push({
      at: inc.occurredAt,
      icon: ShieldAlert,
      tone: "bad",
      title: (
        <Link href={`/kejadian/${inc.id}`} className="hover:underline">
          Kejadian: {[...new Set(mine.map((s) => s.violationName))].join(", ")} (+{mine.reduce((a, s) => a + s.points, 0)})
        </Link>
      ),
      body: inc.location,
    });
  }
  for (const l of c.letters) {
    const link = (
      <Link href={`/bk/surat/${l.id}`} className="hover:underline">
        {LETTER_TYPE_LABEL[l.type]} {l.letterNumber}
      </Link>
    );
    events.push({ at: l.createdAt, icon: FileText, title: <>Surat dibuat: {link}</>, body: `Jadwal ${formatDateTime(l.meetingAt)} · ${l.place}` });
    if (l.sentAt) events.push({ at: l.sentAt, icon: FileText, title: <>Surat dikirim ke orang tua: {link}</> });
    if (l.parentResponseAt)
      events.push({
        at: l.parentResponseAt,
        icon: MessageSquareReply,
        tone: l.parentResponse === "HADIR" ? "good" : "warn",
        title: l.parentResponse === "HADIR" ? "Orang tua mengonfirmasi hadir" : "Orang tua minta jadwal ulang",
        body: l.rescheduleReason ?? undefined,
      });
    if (l.status === "HADIR" || l.status === "TIDAK_HADIR")
      events.push({
        at: l.meetingAt,
        icon: l.status === "HADIR" ? UserCheck : UserX,
        tone: l.status === "HADIR" ? "good" : "bad",
        title: l.status === "HADIR" ? "Orang tua hadir" : "Orang tua tidak hadir",
        body: l.attendanceNote ?? undefined,
      });
    if (l.deletedAt) events.push({ at: l.deletedAt, icon: XCircle, tone: "bad", title: <>Surat dibatalkan: {l.letterNumber}</>, body: l.deleteReason ?? undefined });
  }
  for (const s of c.sessions) {
    events.push({
      at: s.scheduledAt,
      icon: CalendarCheck2,
      tone: s.status === "SELESAI" ? "good" : s.status === "BATAL" ? "bad" : undefined,
      title: `${SESSION_TYPE_LABEL[s.type]} — ${s.status === "SELESAI" ? "selesai" : s.status === "BATAL" ? "batal" : "dijadwalkan"}`,
      body:
        s.status === "SELESAI" && !canRead ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Lock className="size-3" /> Isi catatan konseling bersifat rahasia.
          </span>
        ) : undefined,
    });
  }
  if (c.approvedAt) events.push({ at: c.approvedAt, icon: ShieldCheck, tone: "good", title: `Disetujui Kepala Sekolah (${c.approvedBy?.name ?? "-"})` });
  if (c.closedAt)
    events.push({
      at: c.closedAt,
      icon: CheckCircle2,
      tone: "good",
      title: c.status === "DIRUJUK" ? `Dirujuk ke ${c.referredTo}` : "Kasus ditutup",
      body: c.evaluationSummary ?? undefined,
    });
  events.sort((a, b) => a.at.getTime() - b.at.getTime());

  const toneCls = { good: "bg-success/15 text-success", bad: "bg-destructive/15 text-destructive", warn: "bg-warning/20 text-amber-700 dark:text-warning" };

  return (
    <>
      <PageHeader
        title={c.student.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {c.student.class?.name ?? "-"} · Kasus dibuka {formatShortDate(c.openedAt)} <CaseStatusBadge status={c.status} />
            {c.priority === "TINGGI" && <Badge variant="destructive">Prioritas tinggi</Badge>}
            {c.needsApproval && !c.approvedAt && <Badge variant="warning">Menunggu approval Kepsek</Badge>}
          </span>
        }
        backHref="/bk/kasus"
      />
      <div className="mb-4">
        <CaseActions
          caseId={c.id}
          status={c.status}
          canManage={canManage}
          isBk={isBk}
          isKepsek={user.role === "KEPSEK"}
          assignedToMe={c.assignedBkId === user.id}
          needsApproval={c.needsApproval && !c.approvedAt}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Timeline kasus</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative flex flex-col gap-4 border-l pl-6">
              {events.map((e, i) => (
                <li key={i} className="relative">
                  <span className={cn("absolute -left-[37px] flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground ring-4 ring-card", e.tone && toneCls[e.tone])}>
                    <e.icon className="size-3.5" />
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(e.at)} · {formatTime(e.at)}
                  </p>
                  <p className="text-sm font-medium">{e.title}</p>
                  {e.body && <div className="whitespace-pre-line text-sm text-muted-foreground">{e.body}</div>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm">
              <p>
                <span className="text-muted-foreground">Siswa: </span>
                {["ADMIN", "PKS", "BK", "KEPSEK"].includes(user.role) ? (
                  <Link href={`/siswa/${c.studentId}`} className="font-medium hover:underline">
                    {c.student.name}
                  </Link>
                ) : (
                  c.student.name
                )}
              </p>
              <p>
                <span className="text-muted-foreground">Wali kelas: </span>
                {c.student.class?.waliKelas?.name ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Guru BK: </span>
                {c.assignedBk?.name ?? "Belum ditentukan"}
              </p>
              {c.threshold && (
                <p>
                  <span className="text-muted-foreground">Pemicu: </span>ambang {c.threshold.minPoints} — {c.threshold.action}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Surat</CardTitle>
              {canManage && open && templates.length > 0 && (
                <LetterDialog caseId={c.id} templates={templates} defaultTemplateId={defaultTemplateId} parents={parentNames} defaultDate={toDateInput(new Date(Date.now() + 2 * 86_400_000))} />
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {activeLetters.length === 0 && <p className="text-muted-foreground">{c.needsLetter ? "Perlu surat panggilan." : "Belum ada surat."}</p>}
              {last?.status === "TIDAK_HADIR" && suggestedType && (
                <p className="rounded-md bg-warning/15 p-2 text-xs">Orang tua tidak hadir — disarankan membuat {LETTER_TYPE_LABEL[suggestedType]}.</p>
              )}
              {activeLetters.map((l) => (
                <Link key={l.id} href={`/bk/surat/${l.id}`} className="rounded-md border p-2.5 hover:bg-muted/40">
                  <p className="font-medium">{LETTER_TYPE_LABEL[l.type]}</p>
                  <p className="font-mono text-xs text-muted-foreground">{l.letterNumber}</p>
                  <p className="mt-1 flex items-center justify-between text-xs">
                    <span>{formatDateTime(l.meetingAt)}</span>
                    <Badge variant={l.status === "HADIR" || l.status === "DIKONFIRMASI" ? "success" : l.status === "TIDAK_HADIR" ? "destructive" : "warning"}>
                      {LETTER_STATUS_LABEL[l.status]}
                    </Badge>
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Sesi pendampingan</CardTitle>
              {isBk && open && <ScheduleSessionDialog caseId={c.id} defaultDate={toDateInput(new Date(Date.now() + 86_400_000))} />}
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {c.sessions.length === 0 && <p className="text-muted-foreground">Belum ada sesi.</p>}
              {c.sessions.map((s) => (
                <div key={s.id} className="rounded-md border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{SESSION_TYPE_LABEL[s.type]}</p>
                    <Badge variant={s.status === "SELESAI" ? "success" : s.status === "BATAL" ? "secondary" : "warning"}>
                      {s.status === "SELESAI" ? "Selesai" : s.status === "BATAL" ? "Batal" : "Dijadwalkan"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(s.scheduledAt)}
                    {s.place ? ` · ${s.place}` : ""} · {s.counselor.name}
                  </p>
                  {s.status === "SELESAI" &&
                    (canRead ? (
                      <div className="mt-2 flex flex-col gap-1.5 border-t pt-2 text-xs">
                        <p>
                          <b>Hadir:</b> {s.attendees}
                        </p>
                        <p className="whitespace-pre-line">
                          <b>Masalah:</b> {s.problem}
                        </p>
                        <p className="whitespace-pre-line">
                          <b>Hasil:</b> {s.result}
                        </p>
                        {s.followUpPlan && (
                          <p className="whitespace-pre-line">
                            <b>Tindak lanjut:</b> {s.followUpPlan}
                          </p>
                        )}
                        <PhotoGrid paths={s.attachments.map((a) => a.path)} size="sm" />
                      </div>
                    ) : (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="size-3" /> Catatan rahasia
                      </p>
                    ))}
                  {s.status === "BATAL" && canRead && <p className="mt-1 text-xs text-muted-foreground">{s.followUpPlan}</p>}
                  {isBk && s.status === "DIJADWALKAN" && (
                    <div className="mt-2 flex gap-2">
                      <RecordSessionDialog sessionId={s.id} />
                      <CancelSessionButton sessionId={s.id} />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
