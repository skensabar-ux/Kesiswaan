import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { pageParams } from "@/lib/pagination";
import { displayPhone } from "@/lib/phone";
import { RELATION_LABEL } from "@/lib/constants";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ParentDialog, ParentRowActions } from "./client";

export const metadata = { title: "Orang Tua" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePageRole("ADMIN");
  const params = await searchParams;
  const q = sp(params.q);
  const { page, take, skip } = pageParams(sp(params.page));
  const where: Prisma.ParentWhereInput = q
    ? {
        OR: [
          { name: { contains: q } },
          { waNumber: { contains: q.replace(/^0/, "62") } },
          { students: { some: { student: { OR: [{ name: { contains: q } }, { nisn: { startsWith: q } }] } } } },
        ],
      }
    : {};
  const [rows, total] = await Promise.all([
    prisma.parent.findMany({
      where,
      orderBy: { name: "asc" },
      take,
      skip,
      include: {
        user: { select: { isActive: true, lastLoginAt: true } },
        students: { include: { student: { select: { id: true, name: true, nisn: true, class: { select: { name: true } } } } } },
      },
    }),
    prisma.parent.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Orang Tua / Wali"
        description="Nomor WA dipakai untuk notifikasi. Akun portal dibuat melalui tombol PIN."
        actions={
          <ParentDialog
            trigger={
              <Button>
                <Plus /> Tambah
              </Button>
            }
          />
        }
      />
      <div className="mb-3">
        <SearchInput placeholder="Cari nama ortu / siswa / NISN / WA…" />
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Nama</TH>
                  <TH className="hidden sm:table-cell">Hubungan</TH>
                  <TH className="hidden md:table-cell">No. WA</TH>
                  <TH>Anak</TH>
                  <TH className="hidden md:table-cell">Portal</TH>
                  <TH className="w-32" />
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const students = r.students.map((s) => ({
                    id: s.student.id,
                    name: s.student.name,
                    nisn: s.student.nisn,
                    className: s.student.class?.name ?? null,
                  }));
                  return (
                    <TR key={r.id}>
                      <TD>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{RELATION_LABEL[r.relation]}</p>
                      </TD>
                      <TD className="hidden sm:table-cell">{RELATION_LABEL[r.relation]}</TD>
                      <TD className="hidden md:table-cell">{displayPhone(r.waNumber)}</TD>
                      <TD className="text-sm">
                        {students.map((s) => (
                          <p key={s.id}>
                            {s.name} <span className="text-xs text-muted-foreground">{s.className}</span>
                          </p>
                        ))}
                      </TD>
                      <TD className="hidden md:table-cell">
                        {r.user?.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Belum</Badge>}
                      </TD>
                      <TD>
                        <ParentRowActions
                          hasAccount={Boolean(r.user?.isActive)}
                          row={{
                            id: r.id,
                            name: r.name,
                            relation: r.relation,
                            waNumber: displayPhone(r.waNumber) === "-" ? "" : displayPhone(r.waNumber),
                            occupation: r.occupation ?? "",
                            address: r.address ?? "",
                            students,
                          }}
                        />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={page} total={total} pageSize={take} basePath="/master/ortu" searchParams={params} />
          </>
        )}
      </Card>
    </>
  );
}
