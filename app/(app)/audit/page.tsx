import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { pageParams } from "@/lib/pagination";
import { formatShortDate, formatTime, fromWitaInput } from "@/lib/date";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { FilterSelect } from "@/components/filter-select";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Audit Log" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const ENTITY: Record<string, string> = {
  Incident: "Kejadian",
  SummonsLetter: "Surat",
  Case: "Kasus BK",
  CounselingSession: "Sesi konseling",
  Student: "Siswa",
  Parent: "Orang tua",
  User: "Pengguna",
  Achievement: "Prestasi",
  FollowUpNote: "Tindak lanjut",
  SchoolSetting: "Pengaturan",
  Report: "Laporan",
  WaQueue: "WhatsApp",
};
const ACTION_VARIANT: Record<string, "destructive" | "success" | "warning" | "secondary" | "default"> = {
  DELETE: "destructive",
  REJECT: "destructive",
  CREATE: "success",
  VERIFY: "success",
  APPROVE: "success",
  CLOSE: "success",
  UPDATE: "warning",
  LOGIN: "secondary",
};
const LINK: Record<string, (id: string) => string> = {
  Incident: (id) => `/kejadian/${id}`,
  SummonsLetter: (id) => `/bk/surat/${id}`,
  Case: (id) => `/bk/kasus/${id}`,
  Student: (id) => `/siswa/${id}`,
};

function Json({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-muted-foreground">{label}</summary>
      <pre className="mt-1 max-h-64 max-w-[70vw] overflow-auto rounded bg-muted p-2 text-[11px] leading-snug lg:max-w-xl">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePageRole("ADMIN", "KEPSEK");
  const params = await searchParams;
  const q = sp(params.q);
  const entity = sp(params.entitas);
  const action = sp(params.aksi);
  const from = sp(params.dari);
  const to = sp(params.sampai);
  const { page, take, skip } = pageParams(sp(params.page), 30);
  const date = (d: string, t: string) => {
    try {
      return /^\d{4}-\d{2}-\d{2}$/.test(d) ? fromWitaInput(d, t) : undefined;
    } catch {
      return undefined;
    }
  };
  const where: Prisma.AuditLogWhereInput = {
    ...(entity && { entity }),
    ...(action && { action }),
    ...(q && { OR: [{ user: { name: { contains: q } } }, { user: { username: { contains: q } } }, { entityId: q }] }),
    createdAt: { ...(date(from, "00:00") && { gte: date(from, "00:00") }), ...(date(to, "23:59") && { lte: date(to, "23:59") }) },
  };
  const [rows, total, actions] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take, skip, include: { user: { select: { name: true, role: true } } } }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["action"], orderBy: { action: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Audit Log" description="Jejak perubahan data: siapa, kapan, dari mana, dan data sebelum/sesudah." />
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap">
        <SearchInput placeholder="Cari nama/username pengguna atau ID data…" />
        <DateRangeFilter />
        <FilterSelect param="entitas" placeholder="Semua data" className="w-full lg:w-44" options={Object.entries(ENTITY).map(([value, label]) => ({ value, label }))} />
        <FilterSelect param="aksi" placeholder="Semua aksi" className="w-full lg:w-44" options={actions.map((a) => ({ value: a.action, label: a.action }))} />
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Tidak ada catatan" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Waktu</TH>
                  <TH>Pengguna</TH>
                  <TH>Aksi</TH>
                  <TH className="hidden md:table-cell">IP</TH>
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
                    <TD className="align-top text-sm">{r.user?.name ?? <span className="text-muted-foreground">Sistem / publik</span>}</TD>
                    <TD className="align-top">
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        <Badge variant={ACTION_VARIANT[r.action] ?? "default"}>{r.action}</Badge>
                        <span>{ENTITY[r.entity] ?? r.entity}</span>
                        {r.entityId && LINK[r.entity] && r.action !== "DELETE" ? (
                          <a href={LINK[r.entity]!(r.entityId)} className="font-mono text-xs text-primary hover:underline">
                            {r.entityId.slice(-8)}
                          </a>
                        ) : r.entityId ? (
                          <span className="font-mono text-xs text-muted-foreground">{r.entityId.slice(-8)}</span>
                        ) : null}
                      </div>
                      <Json label="Sebelum" value={r.before} />
                      <Json label="Sesudah" value={r.after} />
                    </TD>
                    <TD className="hidden align-top font-mono text-xs md:table-cell">{r.ip ?? "-"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} total={total} pageSize={take} basePath="/audit" searchParams={params} />
          </>
        )}
      </Card>
    </>
  );
}
