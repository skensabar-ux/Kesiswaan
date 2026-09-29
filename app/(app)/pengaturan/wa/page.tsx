import type { Prisma, QueueStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { pageParams } from "@/lib/pagination";
import { formatShortDate, formatTime } from "@/lib/date";
import { displayPhone } from "@/lib/phone";
import { waConfig } from "@/lib/wa/adapter";
import { appUrl } from "@/lib/url";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { FilterSelect } from "@/components/filter-select";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ProcessNowButton, ResendButton, TestSendForm } from "./client";

export const metadata = { title: "Log WhatsApp" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const STATUS: Record<QueueStatus, { label: string; variant: "warning" | "success" | "destructive" }> = {
  PENDING: { label: "Antre", variant: "warning" },
  SENT: { label: "Terkirim", variant: "success" },
  FAILED: { label: "Gagal", variant: "destructive" },
};
const CONTEXT: Record<string, string> = {
  INCIDENT: "Pelanggaran → ortu",
  INCIDENT_WALAS: "Pelanggaran → walas",
  LETTER: "Surat panggilan",
  REMINDER: "Pengingat H-1",
  PIN: "PIN portal",
  OTP: "OTP login",
  TEST: "Tes kirim",
};

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePageRole("ADMIN");
  const params = await searchParams;
  const status = sp(params.status) as QueueStatus | "";
  const context = sp(params.konteks);
  const { page, take, skip } = pageParams(sp(params.page));
  const where: Prisma.WaQueueWhereInput = {
    ...(status && ["PENDING", "SENT", "FAILED"].includes(status) && { status }),
    ...(context && { context }),
  };
  const [rows, total, grouped, settings] = await Promise.all([
    prisma.waQueue.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.waQueue.count({ where }),
    prisma.waQueue.groupBy({ by: ["status"], _count: true }),
    getSettings(),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count])) as Partial<Record<QueueStatus, number>>;
  const cfg = waConfig();

  return (
    <>
      <PageHeader title="Log WhatsApp" description="Antrean & riwayat pengiriman pesan WA." backHref="/pengaturan" actions={<ProcessNowButton />} />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status gateway</CardTitle>
            <CardDescription>URL & token diatur lewat environment variable.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>
              Pengiriman:{" "}
              {settings.waEnabled ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Nonaktif (atur di Pengaturan)</Badge>}
            </p>
            <p>
              Driver: <span className="font-mono">{cfg.driver}</span> · URL: {cfg.url ? <Badge variant="success">diisi</Badge> : <Badge variant="destructive">kosong</Badge>} · Token:{" "}
              {cfg.token ? <Badge variant="success">diisi</Badge> : <Badge variant="destructive">kosong</Badge>}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(["PENDING", "SENT", "FAILED"] as const).map((s) => (
                <Badge key={s} variant={STATUS[s].variant}>
                  {STATUS[s].label}: {counts[s] ?? 0}
                </Badge>
              ))}
            </div>
            <p className="break-all pt-2 text-xs text-muted-foreground">
              Cron cPanel (tiap 1–5 menit): <span className="font-mono">{appUrl("/api/cron/wa-queue?token=CRON_SECRET")}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tes kirim</CardTitle>
            <CardDescription>Dikirim langsung (tanpa antrean) untuk memastikan gateway berfungsi.</CardDescription>
          </CardHeader>
          <CardContent>
            <TestSendForm />
          </CardContent>
        </Card>
      </div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <FilterSelect param="status" placeholder="Semua status" options={(["PENDING", "SENT", "FAILED"] as const).map((s) => ({ value: s, label: STATUS[s].label }))} />
        <FilterSelect param="konteks" placeholder="Semua jenis" options={Object.entries(CONTEXT).map(([value, label]) => ({ value, label }))} />
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Belum ada pesan" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Waktu</TH>
                  <TH>Tujuan</TH>
                  <TH className="hidden lg:table-cell">Pesan</TH>
                  <TH>Status</TH>
                  <TH className="w-24" />
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap align-top text-xs">
                      {formatShortDate(r.createdAt)}
                      <br />
                      {formatTime(r.createdAt)}
                    </TD>
                    <TD className="align-top">
                      <p className="font-medium">{r.recipientName ?? "-"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{displayPhone(r.to)}</p>
                      <p className="text-xs text-muted-foreground">{CONTEXT[r.context ?? ""] ?? r.context}</p>
                    </TD>
                    <TD className="hidden max-w-md align-top lg:table-cell">
                      <p className="line-clamp-3 whitespace-pre-line text-xs">{r.message}</p>
                    </TD>
                    <TD className="align-top">
                      <Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">Percobaan {r.retryCount}/{r.maxRetry}</p>
                      {r.status !== "SENT" && r.errorMessage && (
                        <p className="mt-1 line-clamp-2 max-w-48 text-xs text-destructive" title={r.responseBody ?? ""}>
                          {r.errorMessage} {r.responseBody?.slice(0, 80)}
                        </p>
                      )}
                    </TD>
                    <TD className="align-top">{r.status !== "SENT" && r.context !== "TEST" && <ResendButton id={r.id} />}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} total={total} pageSize={take} basePath="/pengaturan/wa" searchParams={params} />
          </>
        )}
      </Card>
    </>
  );
}
