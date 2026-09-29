"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteIncident, rejectIncident, verifyIncident } from "@/server/actions/incident";

export function IncidentActions({
  id,
  canVerify,
  canDelete,
  afterDelete = "/kejadian",
  size = "default",
}: {
  id: string;
  canVerify: boolean;
  canDelete: boolean;
  afterDelete?: string;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {canVerify && (
        <>
          <ConfirmAction
            title="Verifikasi kejadian?"
            description="Poin akan masuk ke akumulasi siswa, wali kelas diberi notifikasi, dan ambang sanksi diperiksa."
            confirmLabel="Verifikasi"
            variant="default"
            action={() => verifyIncident(id)}
            trigger={
              <Button size={size}>
                <CheckCircle2 /> Verifikasi
              </Button>
            }
          />
          <ConfirmAction
            title="Tolak laporan?"
            description="Pelapor akan menerima notifikasi beserta alasan penolakan."
            confirmLabel="Tolak"
            requireReason
            action={(reason) => rejectIncident(id, reason)}
            trigger={
              <Button size={size} variant="outline">
                <XCircle /> Tolak
              </Button>
            }
          />
        </>
      )}
      {canDelete && (
        <ConfirmAction
          title="Hapus kejadian?"
          description="Kejadian disembunyikan (soft delete) dan poinnya tidak lagi dihitung. Alasan wajib diisi dan tercatat di audit log."
          confirmLabel="Hapus"
          requireReason
          action={(reason) => deleteIncident(id, reason)}
          onDone={(res) => res.ok && router.push(afterDelete)}
          trigger={
            <Button size={size} variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 /> Hapus
            </Button>
          }
        />
      )}
    </div>
  );
}
