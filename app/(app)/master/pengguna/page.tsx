import { Plus } from "lucide-react";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { pageParams } from "@/lib/pagination";
import { formatDateTime } from "@/lib/date";
import { ROLE_LABEL, STAFF_ROLES } from "@/lib/roles";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { FilterSelect } from "@/components/filter-select";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { UserDialog, UserRowActions } from "./client";

export const metadata = { title: "Pengguna" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const me = await requirePageRole("ADMIN");
  const params = await searchParams;
  const q = sp(params.q);
  const role = sp(params.role) as Role | "";
  const { page, take, skip } = pageParams(sp(params.page));
  const where: Prisma.UserWhereInput = {
    role: role && role !== "ORANG_TUA" ? role : { not: "ORANG_TUA" },
    ...(q && { OR: [{ name: { contains: q } }, { username: { contains: q } }] }),
  };
  const [rows, total, teachers] = await Promise.all([
    prisma.user.findMany({ where, orderBy: [{ role: "asc" }, { name: "asc" }], take, skip, include: { teacher: { select: { id: true, name: true } } } }),
    prisma.user.count({ where }),
    prisma.teacher.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nip: true, userId: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Akun login guru & staf. Akun orang tua dikelola di menu Orang Tua."
        actions={
          <UserDialog
            teachers={teachers}
            trigger={
              <Button>
                <Plus /> Tambah
              </Button>
            }
          />
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Cari nama / username…" />
        <FilterSelect param="role" placeholder="Semua role" options={STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
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
                  <TH className="hidden sm:table-cell">Username</TH>
                  <TH>Role</TH>
                  <TH className="hidden md:table-cell">Login terakhir</TH>
                  <TH className="w-32" />
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id} className={r.isActive ? undefined : "opacity-60"}>
                    <TD>
                      <p className="font-medium">{r.name}</p>
                      <p className="font-mono text-xs text-muted-foreground sm:hidden">{r.username}</p>
                      {!r.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                    </TD>
                    <TD className="hidden sm:table-cell font-mono text-xs">{r.username}</TD>
                    <TD>
                      <Badge variant="outline">{ROLE_LABEL[r.role]}</Badge>
                    </TD>
                    <TD className="hidden md:table-cell text-xs text-muted-foreground">{r.lastLoginAt ? formatDateTime(r.lastLoginAt) : "Belum pernah"}</TD>
                    <TD>
                      <UserRowActions
                        teachers={teachers}
                        isSelf={r.id === me.id}
                        row={{
                          id: r.id,
                          name: r.name,
                          username: r.username,
                          role: r.role as Exclude<Role, "ORANG_TUA">,
                          phone: r.phone ?? "",
                          teacherId: r.teacher?.id ?? "",
                          password: "",
                          isActive: r.isActive,
                        }}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} total={total} pageSize={take} basePath="/master/pengguna" searchParams={params} />
          </>
        )}
      </Card>
    </>
  );
}
