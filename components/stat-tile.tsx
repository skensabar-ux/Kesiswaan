import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatAccent = "blue" | "violet" | "emerald" | "amber" | "rose" | "sky";

const ACCENT: Record<StatAccent, string> = {
  blue: "from-blue-500 to-indigo-600 shadow-indigo-500/30",
  violet: "from-violet-500 to-purple-600 shadow-purple-500/30",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
  amber: "from-amber-400 to-orange-500 shadow-orange-500/30",
  rose: "from-rose-500 to-red-600 shadow-rose-500/30",
  sky: "from-sky-400 to-cyan-600 shadow-sky-500/30",
};

export function StatTile({
  label,
  value,
  icon: Icon,
  href,
  tone,
  accent = "blue",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  tone?: "warn" | "bad";
  accent?: StatAccent;
}) {
  // tone (peringatan) menimpa warna dasar supaya angka yang perlu ditindaklanjuti menonjol
  const color = tone === "bad" ? "rose" : tone === "warn" ? "amber" : accent;
  const body = (
    <Card className={cn("group relative h-full overflow-hidden transition-all", href && "hover:-translate-y-0.5 hover:shadow-lift")}>
      <div className={cn("pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br opacity-[0.08]", ACCENT[color])} />
      <CardContent className="flex flex-col items-start gap-3 pt-4 sm:flex-row sm:items-center sm:gap-3.5 md:pt-5">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", ACCENT[color])}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1 sm:pr-3">
          <p className="text-[1.65rem] font-extrabold leading-none tracking-tight tabular-nums">{value}</p>
          <p className="mt-1.5 text-xs font-medium leading-tight text-muted-foreground">{label}</p>
        </div>
        {href && <ArrowUpRight className="absolute right-3 top-3 size-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}
