import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { pageParams } from "@/lib/pagination";
import { displayPhone } from "@/lib/phone";
import { ROLE_LABEL } from "@/lib/roles";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TeacherDialog, TeacherRowActions } from "./client";

export const metadata = { title: "Guru" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePageRole("ADMIN");
  const params = await searchParams;
  const q = sp(params.q);
  const { page, take, skip } = pageParams(sp(params.page));
  const where: Prisma.TeacherWhereInput = q ? { OR: [{ name: { contains: q } }, { nip: { contains: q } }] } : {};
  const [rows, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      orderBy: { name: "asc" },
      take,
      skip,
      include: {
        user: { select: { username: true, role: true } },
        homeroomClasses: { where: { academicYear: { isActive: true } }, select: { name: true } },
      },
    }),
    prisma.teacher.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        title="Guru"
        description="Data guru & pegawai. Akun login dikelola di menu Pengguna."
        actions={
          <TeacherDialog
            trigger={
              <Button>
                <Plus /> Tambah
              </Button>
            }
          />
        }
      />
      <div className="mb-3">
        <SearchInput placeholder="Cari nama / NIP…" />
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
                  <TH className="hidden sm:table-cell">NIP</TH>
                  <TH className="hidden md:table-cell">No. HP/WA</TH>
                  <TH className="hidden md:table-cell">Wali Kelas</TH>
                  <TH>Akun</TH>
                  <TH className="w-24" />
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <p className="font-medium">{r.name}</p>
                      {!r.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                    </TD>
                    <TD className="hidden sm:table-cell font-mono text-xs">{r.nip ?? "-"}</TD>
                    <TD className="hidden md:table-cell">{displayPhone(r.phone)}</TD>
                    <TD className="hidden md:table-cell">{r.homeroomClasses.map((c) => c.name).join(", ") || "-"}</TD>
                    <TD>{r.user ? <Badge variant="outline">{ROLE_LABEL[r.user.role]}</Badge> : <span className="text-xs text-muted-foreground">Belum ada</span>}</TD>
                    <TD>
                      <TeacherRowActions row={{ id: r.id, nip: r.nip ?? "", name: r.name, phone: r.phone ?? "", isActive: r.isActive }} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} total={total} pageSize={take} basePath="/master/guru" searchParams={params} />
          </>
        )}
      </Card>
    </>
  );
}
