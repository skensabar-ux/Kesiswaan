import Link from "next/link";
import { requirePageRole } from "@/lib/rbac";
import { NAV } from "@/components/layout/nav-items";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Master Data" };

export default async function Page() {
  await requirePageRole("ADMIN");
  const items = NAV.flatMap((g) => g.items).filter((i) => i.href.startsWith("/master/"));
  return (
    <>
      <PageHeader title="Master Data" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {items.map((i) => (
          <Link key={i.href} href={i.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex flex-col items-start gap-3 pt-4 md:pt-5">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <i.icon className="size-5" />
                </div>
                <p className="font-medium">{i.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
