import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatTile({ label, value, icon: Icon, href, tone }: { label: string; value: number | string; icon: LucideIcon; href?: string; tone?: "warn" | "bad" }) {
  const body = (
    <Card className={cn("h-full transition-colors", href && "hover:border-primary/40")}>
      <CardContent className="flex items-center gap-3 pt-4 md:pt-5">
        <div className={cn("rounded-lg p-2.5", tone === "bad" ? "bg-destructive/10 text-destructive" : tone === "warn" ? "bg-warning/20 text-amber-700 dark:text-warning" : "bg-primary/10 text-primary")}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
          <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
