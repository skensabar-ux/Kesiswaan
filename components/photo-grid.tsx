"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function PhotoGrid({ paths, size = "md" }: { paths: string[]; size?: "sm" | "md" }) {
  const [open, setOpen] = useState<string | null>(null);
  if (paths.length === 0) return null;
  return (
    <>
      <div className={size === "sm" ? "flex gap-2" : "grid grid-cols-3 gap-2"}>
        {paths.map((p, i) => (
          <button
            key={p}
            type="button"
            onClick={() => setOpen(p)}
            className={size === "sm" ? "size-14 overflow-hidden rounded-md border bg-muted" : "aspect-square overflow-hidden rounded-lg border bg-muted"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${p}`} alt={`Bukti ${i + 1}`} className="size-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="sr-only">Foto bukti</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {open && <img src={`/api/files/${open}`} alt="Foto bukti" className="max-h-[85dvh] w-full rounded-t-2xl object-contain sm:rounded-xl" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
