import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/motion/count-up";

export type StatAccent = "green" | "teal" | "lime" | "sky" | "amber" | "rose";

const ACCENT: Record<StatAccent, string> = {
  green: "from-emerald-500 to-green-700 shadow-emerald-600/30",
  teal: "from-teal-400 to-cyan-700 shadow-teal-600/30",
  lime: "from-lime-400 to-emerald-600 shadow-lime-600/30",
  sky: "from-sky-400 to-blue-600 shadow-sky-600/30",
  amber: "from-amber-400 to-orange-500 shadow-orange-500/30",
  rose: "from-rose-500 to-red-600 shadow-rose-500/30",
};

export function StatTile({
  label,
  value,
  icon: Icon,
  href,
  tone,
  accent = "green",
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
      <div className={cn("pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br opacity-[0.1] transition-transform duration-500 group-hover:scale-125", ACCENT[color])} />
      <CardContent className="flex flex-col items-start gap-3 pt-4 sm:flex-row sm:items-center sm:gap-3.5 md:pt-5">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110", ACCENT[color])}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1 sm:pr-3">
          <p className="text-[1.65rem] font-extrabold leading-none tracking-tight tabular-nums">{typeof value === "number" ? <CountUp value={value} /> : value}</p>
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
