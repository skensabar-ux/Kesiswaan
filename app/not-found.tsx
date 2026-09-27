import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <p className="text-lg font-semibold">Halaman tidak ditemukan</p>
      <Button asChild variant="outline">
        <Link href="/">Kembali ke beranda</Link>
      </Button>
    </main>
  );
}
