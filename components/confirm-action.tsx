"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { handleResult, type ClientActionResult } from "@/components/action-helpers";

/**
 * Tombol + dialog konfirmasi yang memanggil server action.
 * Bila `requireReason`, pengguna wajib mengisi alasan (dipakai untuk soft delete).
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
  variant = "destructive",
  requireReason,
  action,
  onDone,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  requireReason?: boolean;
  action: (reason?: string) => Promise<ClientActionResult>;
  onDone?: (res: ClientActionResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {requireReason && (
          <DialogBody>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tuliskan alasan…" rows={3} />
          </DialogBody>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button
            variant={variant}
            disabled={pending || (requireReason && reason.trim().length < 3)}
            onClick={() =>
              start(async () => {
                const res = await action(requireReason ? reason.trim() : undefined);
                if (handleResult(res)) {
                  setOpen(false);
                  setReason("");
                  router.refresh();
                }
                onDone?.(res);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
