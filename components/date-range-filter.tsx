"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

/** Filter rentang tanggal (?dari=YYYY-MM-DD&sampai=YYYY-MM-DD). */
export function DateRangeFilter({ fromParam = "dari", toParam = "sampai" }: { fromParam?: string; toParam?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 lg:flex">
      <Input type="date" aria-label="Dari tanggal" className="min-w-0 px-2.5 lg:w-40 lg:px-3" value={params.get(fromParam) ?? ""} onChange={(e) => set(fromParam, e.target.value)} />
      <span className="text-sm text-muted-foreground">s.d.</span>
      <Input type="date" aria-label="Sampai tanggal" className="min-w-0 px-2.5 lg:w-40 lg:px-3" value={params.get(toParam) ?? ""} onChange={(e) => set(toParam, e.target.value)} />
    </div>
  );
}
