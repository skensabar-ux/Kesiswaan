import Link from "next/link";
import { Columns3, List } from "lucide-react";
import type { CaseStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { pageParams } from "@/lib/pagination";
import { formatShortDate } from "@/lib/date";
import { sp, cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { FilterSelect } from "@/components/filter-select";
import { Pagination } from "@/components/pagination";
import { CaseStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { NewCaseDialog } from "../components";

export const metadata = { title: "Kasus BK" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const COLUMNS: { status: CaseStatus; label: string }[] = [
  { status: "BARU", label: "Baru" },
  { status: "DIJADWALKAN", label: "Dijadwalkan" },
  { status: "PROSES_PENDAMPINGAN", label: "Proses pendampingan" },
  { status: "MENUNGGU_EVALUASI", label: "Menunggu evaluasi" },
];
const ALL_STATUS: CaseStatus[] = ["BARU", "DIJADWALKAN", "PROSES_PENDAMPINGAN", "MENUNGGU_EVALUASI", "SELESAI", "DIRUJUK"];

const include = {
  student: { select: { name: true, class: { select: { name: true } } } },
  assignedBk: { select: { name: true } },
  _count: { select: { letters: { where: { deletedAt: null } }, sessions: true, incidents: true } },
} satisfies Prisma.CaseInclude;
type Row = Prisma.CaseGetPayload<{ include: typeof include }>;

function Flags({ c }: { c: Row }) {
  return (
    <div className="flex flex-wrap gap-1">
      {c.priority === "TINGGI" && <Badge variant="destructive">Prioritas tinggi</Badge>}
      {c.needsLetter && c._count.letters === 0 && <Badge variant="warning">Perlu surat</Badge>}
      {c.needsApproval && !c.approvedAt && <Badge variant="warning">Approval Kepsek</Badge>}
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requirePageRole("ADMIN", "PKS", "BK", "KEPSEK");
  const params = await searchParams;
  const table = sp(params.tampilan) === "tabel";
  const q = sp(params.q);
  const status = sp(params.status) as CaseStatus | "";
  const mine = sp(params.milik) === "saya";
  const searchWhere: Prisma.CaseWhereInput = {
    ...(q && { student: { OR: [{ name: { contains: q } }, { nisn: { startsWith: q } }] } }),
    ...(mine && { assignedBkId: user.id }),
  };
  const canCreate = ["ADMIN", "BK", "PKS"].includes(user.role);

  const header = (
    <PageHeader
      title="Kasus BK"
      description="Kasus dibuat otomatis dari ambang poin / pelanggaran berat, atau manual."
      actions={
        <>
          <Button variant="outline" asChild>
            <Link href={table ? "/bk/kasus" : "/bk/kasus?tampilan=tabel"}>{table ? <Columns3 /> : <List />} {table ? "Kanban" : "Tabel"}</Link>
          </Button>
          {canCreate && <NewCaseDialog />}
        </>
      }
    />
  );
  const filters = (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row">
      <SearchInput placeholder="Cari nama siswa / NISN…" />
      {user.role === "BK" && <FilterSelect param="milik" placeholder="Semua kasus" options={[{ value: "saya", label: "Kasus saya" }]} />}
      {table && <FilterSelect param="status" placeholder="Semua status" options={ALL_STATUS.map((s) => ({ value: s, label: s.replaceAll("_", " ").toLowerCase() }))} />}
    </div>
  );

  if (table) {
    const { page, take, skip } = pageParams(sp(params.page));
    const where = { ...searchWhere, ...(status && ALL_STATUS.includes(status) && { status }) };
    const [rows, total] = await Promise.all([
      prisma.case.findMany({ where, include, orderBy: { openedAt: "desc" }, take, skip }),
      prisma.case.count({ where }),
    ]);
    return (
      <>
        {header}
        {filters}
        <Card>
          {rows.length === 0 ? (
            <EmptyState title="Tidak ada kasus" />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Siswa</TH>
                    <TH className="hidden md:table-cell">Masalah</TH>
                    <TH>Status</TH>
                    <TH className="hidden lg:table-cell">Guru BK</TH>
                    <TH className="hidden sm:table-cell">Dibuka</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((c) => (
                    <TR key={c.id}>
                      <TD>
                        <Link href={`/bk/kasus/${c.id}`} className="font-medium hover:underline">
                          {c.student.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{c.student.class?.name ?? "-"}</p>
                      </TD>
                      <TD className="hidden max-w-sm md:table-cell">
                        <p className="text-sm">{c.title}</p>
                        <Flags c={c} />
                      </TD>
                      <TD>
                        <CaseStatusBadge status={c.status} />
                      </TD>
                      <TD className="hidden lg:table-cell text-sm">{c.assignedBk?.name ?? "-"}</TD>
                      <TD className="hidden sm:table-cell text-sm">{formatShortDate(c.openedAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Pagination page={page} total={total} pageSize={take} basePath="/bk/kasus" searchParams={params} />
            </>
          )}
        </Card>
      </>
    );
  }

  const [open, closedCount] = await Promise.all([
    prisma.case.findMany({
      where: { ...searchWhere, status: { in: COLUMNS.map((c) => c.status) } },
      include,
      orderBy: [{ priority: "desc" }, { openedAt: "asc" }],
      take: 400,
    }),
    prisma.case.count({ where: { ...searchWhere, status: { in: ["SELESAI", "DIRUJUK"] } } }),
  ]);
  return (
    <>
      {header}
      {filters}
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:px-0 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = open.filter((c) => c.status === col.status);
          return (
            <div key={col.status} className="flex w-[82vw] shrink-0 snap-start flex-col gap-2 rounded-xl bg-muted/50 p-2.5 md:w-auto">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-semibold">{col.label}</p>
                <span className="rounded-full bg-background px-2 text-xs font-medium tabular-nums">{items.length}</span>
              </div>
              {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">Kosong</p>}
              {items.map((c) => (
                <Link key={c.id} href={`/bk/kasus/${c.id}`}>
                  <Card className={cn("p-3 transition-colors hover:border-primary/40", c.priority === "TINGGI" && "border-l-4 border-l-destructive")}>
                    <p className="font-medium leading-tight">{c.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.student.class?.name ?? "-"} · dibuka {formatShortDate(c.openedAt)}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-sm">{c.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Flags c={c} />
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {c._count.letters} surat · {c._count.sessions} sesi
                      </span>
                    </div>
                    {c.assignedBk && <p className="mt-1 text-xs text-muted-foreground">BK: {c.assignedBk.name}</p>}
                  </Card>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {closedCount} kasus selesai/dirujuk —{" "}
        <Link className="text-primary hover:underline" href="/bk/kasus?tampilan=tabel&status=SELESAI">
          lihat
        </Link>
      </p>
    </>
  );
}
