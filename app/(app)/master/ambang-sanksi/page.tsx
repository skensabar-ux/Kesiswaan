import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { ROLE_LABEL, type AppRole } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ThresholdDialog, ThresholdRowActions } from "./client";

export const metadata = { title: "Ambang Sanksi" };

const DOT: Record<string, string> = { green: "bg-success", amber: "bg-warning", red: "bg-destructive" };

export default async function Page() {
  await requirePageRole("ADMIN");
  const [rows, templates] = await Promise.all([
    prisma.sanctionThreshold.findMany({ orderBy: { minPoints: "asc" }, include: { template: { select: { name: true } } } }),
    prisma.letterTemplate.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader
        title="Ambang Sanksi"
        description="Tindakan otomatis ketika akumulasi poin siswa (per tahun ajaran) mencapai ambang. Pelanggaran kategori Berat langsung membuat kasus BK."
        actions={
          <ThresholdDialog
            templates={templates}
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
                <TH>Poin</TH>
                <TH>Tindakan</TH>
                <TH className="hidden md:table-cell">Template</TH>
                <TH className="hidden sm:table-cell">Otomatis</TH>
                <TH className="w-12 sm:w-24" />
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => {
                const roles = (Array.isArray(r.notifyRoles) ? r.notifyRoles : []) as AppRole[];
                return (
                  <TR key={r.id} className={r.isActive ? undefined : "opacity-60"}>
                    <TD>
                      <span className="inline-flex items-center gap-2 whitespace-nowrap font-semibold">
                        <span className={cn("size-2.5 rounded-full", DOT[r.color])} />≥ {r.minPoints}
                      </span>
                    </TD>
                    <TD className="max-w-xs">{r.action}</TD>
                    <TD className="hidden md:table-cell text-muted-foreground">{r.template?.name ?? "-"}</TD>
                    <TD className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {r.autoCreateCase && <Badge>Kasus BK</Badge>}
                        {r.requiresApproval && <Badge variant="warning">Approval Kepsek</Badge>}
                        {roles.map((role) => (
                          <Badge key={role} variant="outline">
                            Notif {ROLE_LABEL[role]}
                          </Badge>
                        ))}
                      </div>
                    </TD>
                    <TD>
                      <ThresholdRowActions
                        templates={templates}
                        row={{
                          id: r.id,
                          minPoints: r.minPoints,
                          action: r.action,
                          templateId: r.templateId ?? "",
                          autoCreateCase: r.autoCreateCase,
                          requiresApproval: r.requiresApproval,
                          notifyRoles: roles,
                          color: r.color as "green" | "amber" | "red",
                          isActive: r.isActive,
                        }}
                      />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
