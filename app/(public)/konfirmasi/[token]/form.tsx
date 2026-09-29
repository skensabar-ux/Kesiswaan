"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { handleResult } from "@/components/action-helpers";
import { respondToLetter } from "@/server/actions/letter-public";

export function ResponseForm({ token, current }: { token: string; current: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reschedule">("idle");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const send = (response: "HADIR" | "JADWAL_ULANG") =>
    start(async () => {
      if (handleResult(await respondToLetter({ token, response, reason: response === "JADWAL_ULANG" ? reason : undefined }))) {
        setMode("idle");
        router.refresh();
      }
    });
  if (mode === "reschedule") {
    return (
      <div className="flex flex-col gap-2">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan & usulan waktu, mis. 'Sedang di luar kota, bisa hari Kamis pagi.'" />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setMode("idle")} disabled={pending}>
            Batal
          </Button>
          <Button className="flex-1" onClick={() => send("JADWAL_ULANG")} disabled={pending || reason.trim().length < 5}>
            {pending && <Loader2 className="animate-spin" />} Kirim permintaan
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {current !== "DIKONFIRMASI" && (
        <Button size="lg" onClick={() => send("HADIR")} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Konfirmasi Hadir
        </Button>
      )}
      <Button size="lg" variant="outline" onClick={() => setMode("reschedule")} disabled={pending}>
        <CalendarClock /> Minta Jadwal Ulang
      </Button>
    </div>
  );
}
