import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  searchParams,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-sm";
  return (
    <div className="flex items-center justify-between gap-2 border-t px-3 py-3 text-sm text-muted-foreground">
      <span>
        {from}–{to} dari {total}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link className={cn(btn, "hover:bg-accent")} href={href(page - 1)}>
            <ChevronLeft className="size-4" /> Sebelumnya
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")}>
            <ChevronLeft className="size-4" /> Sebelumnya
          </span>
        )}
        <span className="hidden sm:inline">
          {page}/{pages}
        </span>
        {page < pages ? (
          <Link className={cn(btn, "hover:bg-accent")} href={href(page + 1)}>
            Berikutnya <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")}>
            Berikutnya <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
