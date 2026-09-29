import Link from "next/link";
import type { LetterStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { pageParams } from "@/lib/pagination";
import { formatDateTime, formatShortDate } from "@/lib/date";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { APPROVAL_REQUIRED, LETTER_STATUS_LABEL, letterBadgeVariant } from "@/lib/letter";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { FilterSelect } from "@/components/filter-select";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Surat Panggilan" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const STATUSES = Object.keys(LETTER_STATUS_LABEL) as LetterStatus[];

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requirePageRole("ADMIN", "PKS", "BK", "KEPSEK");
  const params = await searchParams;
  const q = sp(params.q);
  const status = sp(params.status);
  const filter = sp(params.filter);
  const { page, take, skip } = pageParams(sp(params.page));
  const where: Prisma.SummonsLetterWhereInput = {
    deletedAt: null,
    ...(q && { OR: [{ letterNumber: { contains: q } }, { case: { student: { name: { contains: q } } } }] }),
    ...(STATUSES.includes(status as LetterStatus) && { status: status as LetterStatus }),
    ...(filter === "belum-konfirmasi" && { status: "TERKIRIM", meetingAt: { gte: new Date() } }),
    ...(filter === "perlu-approval" && { type: { in: APPROVAL_REQUIRED }, approvedAt: null, status: "DRAFT" }),
  };
  const [rows, total] = await Promise.all([
    prisma.summonsLetter.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { case: { select: { student: { select: { name: true, class: { select: { name: true } } } } } } },
    }),
    prisma.summonsLetter.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Surat Panggilan" description={user.role === "KEPSEK" ? "Surat Panggilan III & Surat Perjanjian memerlukan persetujuan Anda sebelum dikirim." : "Buat surat dari halaman kasus BK."} />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Cari nomor surat / nama siswa…" />
        <FilterSelect
          param="filter"
          placeholder="Semua surat"
          options={[
            { value: "belum-konfirmasi", label: "Belum dikonfirmasi ortu" },
            { value: "perlu-approval", label: "Menunggu approval Kepsek" },
          ]}
        />
        <FilterSelect param="status" placeholder="Semua status" options={STATUSES.map((s) => ({ value: s, label: LETTER_STATUS_LABEL[s] }))} />
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Tidak ada surat" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Surat</TH>
                  <TH>Siswa</TH>
                  <TH className="hidden md:table-cell">Pertemuan</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((l) => (
                  <TR key={l.id}>
                    <TD>
                      <Link href={`/bk/surat/${l.id}`} className="font-medium hover:underline">
                        {LETTER_TYPE_LABEL[l.type]}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">{l.letterNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatShortDate(l.letterDate)}</p>
                    </TD>
                    <TD>
                      {l.case.student.name}
                      <p className="text-xs text-muted-foreground">{l.case.student.class?.name ?? "-"}</p>
                    </TD>
                    <TD className="hidden md:table-cell text-sm">{formatDateTime(l.meetingAt)}</TD>
                    <TD>
                      <Badge variant={letterBadgeVariant(l.status)}>{LETTER_STATUS_LABEL[l.status]}</Badge>
                      {APPROVAL_REQUIRED.includes(l.type) && !l.approvedAt && l.status === "DRAFT" && (
                        <Badge variant="warning" className="mt-1">
                          Perlu approval
                        </Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} total={total} pageSize={take} basePath="/bk/surat" searchParams={params} />
          </>
        )}
      </Card>
    </>
  );
}
