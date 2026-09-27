"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import type { ClientActionResult } from "@/components/action-helpers";

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label="Ubah">
      <Pencil />
    </Button>
  );
}

export function DeleteButton({ name, action }: { name: string; action: () => Promise<ClientActionResult> }) {
  return (
    <ConfirmAction
      title="Hapus data?"
      description={`"${name}" akan dihapus permanen.`}
      confirmLabel="Hapus"
      action={() => action()}
      trigger={
        <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive hover:text-destructive">
          <Trash2 />
        </Button>
      }
    />
  );
}
