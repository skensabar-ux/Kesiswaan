"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-lg font-semibold">Terjadi kesalahan</p>
      <p className="text-sm text-muted-foreground">Silakan muat ulang halaman. Bila berlanjut, hubungi administrator.</p>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
}
