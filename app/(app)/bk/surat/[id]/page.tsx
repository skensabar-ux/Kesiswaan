import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { formatDateTime, toDateInput, toTimeInput } from "@/lib/date";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { APPROVAL_REQUIRED, LETTER_STATUS_LABEL } from "@/lib/letter";
import { appUrl } from "@/lib/url";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LetterActions } from "../../components";

export const metadata = { title: "Detail Surat" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole("ADMIN", "PKS", "BK", "KEPSEK");
  const { id } = await params;
  const l = await prisma.summonsLetter.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      case: { select: { id: true, student: { select: { name: true, class: { select: { name: true } } } } } },
    },
  });
  if (!l) notFound();
  const needsApproval = APPROVAL_REQUIRED.includes(l.type);
  const canManage = (user.role === "ADMIN" || user.role === "BK") && !l.deletedAt;
  const waCount = await prisma.waQueue.groupBy({ by: ["status"], where: { refId: l.id }, _count: true });

  return (
    <>
      <PageHeader
        title={`${LETTER_TYPE_LABEL[l.type]} — ${l.case.student.name}`}
        description={<span className="font-mono">{l.letterNumber}</span>}
        backHref={`/bk/kasus/${l.case.id}`}
      />
      {!l.deletedAt && (
        <div className="mb-4">
          <LetterActions
            id={l.id}
            status={l.status}
            canManage={canManage}
            isKepsek={user.role === "KEPSEK"}
            needsApproval={needsApproval}
            approved={Boolean(l.approvedAt)}
            meetingDate={toDateInput(l.meetingAt)}
            meetingTime={toTimeInput(l.meetingAt)}
            place={l.place}
          />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Rincian</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>
              <span className="text-muted-foreground">Status: </span>
              {l.deletedAt ? <Badge variant="destructive">Dibatalkan</Badge> : <Badge>{LETTER_STATUS_LABEL[l.status]}</Badge>}
            </p>
            {l.deletedAt && <p className="text-destructive">Alasan: {l.deleteReason}</p>}
            <p>
              <span className="text-muted-foreground">Kepada: </span>
              {l.parentName ?? "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Pertemuan: </span>
              {formatDateTime(l.meetingAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Tempat: </span>
              {l.place}
            </p>
            <p>
              <span className="text-muted-foreground">Perihal: </span>
              {l.subject}
            </p>
            <p>
              <span className="text-muted-foreground">Dibuat oleh: </span>
              {l.createdBy.name}
            </p>
            {needsApproval && (
              <p>
                <span className="text-muted-foreground">Persetujuan Kepsek: </span>
                {l.approvedAt ? `${l.approvedBy?.name} · ${formatDateTime(l.approvedAt)}` : <Badge variant="warning">Belum</Badge>}
              </p>
            )}
            {l.sentAt && (
              <p>
                <span className="text-muted-foreground">Dikirim: </span>
                {formatDateTime(l.sentAt)} · WA {waCount.map((w) => `${w.status.toLowerCase()} ${w._count}`).join(", ") || "-"}
              </p>
            )}
            {l.parentResponseAt && (
              <p>
                <span className="text-muted-foreground">Tanggapan ortu: </span>
                {l.parentResponse === "HADIR" ? "Konfirmasi hadir" : `Minta jadwal ulang — ${l.rescheduleReason}`} ({formatDateTime(l.parentResponseAt)})
              </p>
            )}
            {l.reminderSentAt && (
              <p>
                <span className="text-muted-foreground">Pengingat H-1: </span>
                {formatDateTime(l.reminderSentAt)}
              </p>
            )}
            {l.attendanceNote && (
              <p>
                <span className="text-muted-foreground">Catatan kehadiran: </span>
                {l.attendanceNote}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {/* browser HP umumnya tidak bisa menampilkan PDF di dalam halaman: buka di penampil PDF */}
              <Button size="sm" className="md:hidden" asChild>
                <a href={`/api/surat/${l.id}/pdf`} target="_blank" rel="noopener">
                  <FileText /> Lihat PDF
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/surat/${l.id}/pdf?unduh=1`}>
                  <Download /> Unduh PDF
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/verifikasi/${l.verifyToken}`} target="_blank">
                  <ExternalLink /> Halaman verifikasi
                </Link>
              </Button>
            </div>
            {l.status !== "DRAFT" && !l.deletedAt && (
              <p className="break-all text-xs text-muted-foreground">Tautan orang tua: {appUrl(`/konfirmasi/${l.responseToken}`)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="hidden overflow-hidden md:block lg:col-span-2">
          <iframe title="Pratinjau surat" src={`/api/surat/${l.id}/pdf`} className="h-[75vh] w-full bg-muted" />
        </Card>
      </div>
    </>
  );
}
