import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { LetterTemplateDialog, LetterTemplateRowActions } from "./client";

export const metadata = { title: "Template Surat" };

export default async function Page() {
  await requirePageRole("ADMIN");
  const rows = await prisma.letterTemplate.findMany({ orderBy: { code: "asc" }, include: { _count: { select: { letters: true } } } });
  return (
    <>
      <PageHeader
        title="Template Surat"
        description="Isi surat (tanpa kop & tanda tangan — keduanya ditambahkan otomatis saat membuat PDF)."
        actions={
          <LetterTemplateDialog
            trigger={
              <Button>
                <Plus /> Tambah
              </Button>
            }
          />
        }
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="hidden sm:table-cell">Kode</TH>
                <TH>Nama</TH>
                <TH className="hidden md:table-cell">Jenis</TH>
                <TH className="hidden md:table-cell">Diperbarui</TH>
                <TH className="hidden sm:table-cell">Dipakai</TH>
                <TH className="w-12 sm:w-24" />
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id} className={r.isActive ? undefined : "opacity-60"}>
                  <TD className="hidden sm:table-cell font-mono text-xs">{r.code}</TD>
                  <TD>
                    <p className="font-medium">{r.name}</p>
                    {!r.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                  </TD>
                  <TD className="hidden md:table-cell">{LETTER_TYPE_LABEL[r.type]}</TD>
                  <TD className="hidden md:table-cell text-muted-foreground">{formatDate(r.updatedAt)}</TD>
                  <TD className="hidden sm:table-cell">{r._count.letters}</TD>
                  <TD>
                    <LetterTemplateRowActions
                      row={{ id: r.id, code: r.code, name: r.name, type: r.type, body: r.body, isActive: r.isActive }}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
