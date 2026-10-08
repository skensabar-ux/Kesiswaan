import { CalendarDays, GraduationCap } from "lucide-react";
import { witaParts } from "@/lib/date";

/** Sapaan sesuai jam WITA. */
function greeting(hour: number) {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function WelcomeBanner({
  name,
  roleLabel,
  dateLabel,
  yearLabel,
  action,
}: {
  name: string;
  roleLabel: string;
  dateLabel: string;
  yearLabel: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-brand relative mb-5 overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-primary/20 md:mb-6 md:p-7">
      <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-16 -right-10 size-56 rounded-full border-[28px] border-white/10" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
            {roleLabel}
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
            {greeting(witaParts(new Date()).hour)}, {name} <span aria-hidden>👋</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" /> {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="size-4" /> {yearLabel}
            </span>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </section>
  );
}
