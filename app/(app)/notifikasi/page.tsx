import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { pageParams } from "@/lib/pagination";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { Card } from "@/components/ui/card";
import { MarkAllReadButton, NotificationItem } from "./client";

export const metadata = { title: "Notifikasi" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requirePageRole();
  const params = await searchParams;
  const { page, take, skip } = pageParams(sp(params.page));
  const where = { userId: user.id };
  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifikasi" description={`${unread} belum dibaca`} actions={unread > 0 && <MarkAllReadButton />} />
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Belum ada notifikasi" />
        ) : (
          <>
            <ul className="divide-y">
              {rows.map((n) => (
                <NotificationItem key={n.id} n={{ id: n.id, title: n.title, body: n.body, link: n.link, isRead: n.isRead, createdAt: n.createdAt.toISOString() }} />
              ))}
            </ul>
            <Pagination page={page} total={total} pageSize={take} basePath="/notifikasi" searchParams={params} />
          </>
        )}
      </Card>
    </div>
  );
}
