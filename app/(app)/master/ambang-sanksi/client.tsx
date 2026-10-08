"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField, FormField } from "@/components/form-field";
import { FormDialog } from "@/components/form-dialog";
import { DeleteButton, EditButton } from "@/components/row-actions";
import { handleResult } from "@/components/action-helpers";
import { ROLE_LABEL } from "@/lib/roles";
import { thresholdSchema } from "@/lib/validators/master";
import { deleteThreshold, saveThreshold } from "@/server/actions/master/threshold";
import { RowActionGroup } from "@/components/row-action-group";

type V = z.infer<typeof thresholdSchema>;
type Row = V & { id: string };
type Tpl = { id: string; name: string };

const NOTIFY_ROLES = ["WALI_KELAS", "BK", "PKS", "KEPSEK"] as const;

export function ThresholdDialog({
  initial,
  templates,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  initial?: Row;
  templates: Tpl[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const router = useRouter();
  const f = useForm<V>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: initial ?? {
      minPoints: 25,
      action: "",
      templateId: "",
      autoCreateCase: false,
      requiresApproval: false,
      notifyRoles: ["WALI_KELAS"],
      color: "amber",
      isActive: true,
    },
  });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await saveThreshold(initial?.id ?? null, v), f.setError)) {
      setOpen(false);
      if (!initial) f.reset();
      router.refresh();
    }
  });
  return (
    <FormDialog open={open} onOpenChange={setOpen} trigger={trigger} title={initial ? "Ubah Ambang" : "Tambah Ambang"} onSubmit={submit} submitting={f.formState.isSubmitting} wide>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Akumulasi poin minimal" required error={e.minPoints?.message}>
          <Input type="number" min={1} inputMode="numeric" {...f.register("minPoints", { valueAsNumber: true })} />
        </FormField>
        <FormField label="Warna penanda" required error={e.color?.message}>
          <Select {...f.register("color")}>
            <option value="green">Hijau</option>
            <option value="amber">Kuning</option>
            <option value="red">Merah</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Tindakan" required error={e.action?.message}>
        <Textarea rows={2} placeholder="Surat Panggilan I + pendampingan BK" {...f.register("action")} />
      </FormField>
      <FormField label="Template surat yang disarankan" error={e.templateId?.message}>
        <Select {...f.register("templateId")}>
          <option value="">— Tidak ada —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-2 sm:grid-cols-2">
        <CheckboxField label="Buat kasus BK otomatis" description="Ditandai 'perlu surat panggilan'." {...f.register("autoCreateCase")} />
        <CheckboxField label="Perlu approval Kepsek" {...f.register("requiresApproval")} />
      </div>
      <FormField label="Kirim notifikasi ke" error={e.notifyRoles?.message}>
        <div className="grid grid-cols-2 gap-2">
          {NOTIFY_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={r} className="size-4 accent-[var(--primary)]" {...f.register("notifyRoles")} />
              {ROLE_LABEL[r]}
            </label>
          ))}
        </div>
      </FormField>
      <CheckboxField label="Aktif" {...f.register("isActive")} />
    </FormDialog>
  );
}

export function ThresholdRowActions({ row, templates }: { row: Row; templates: Tpl[] }) {
  const [open, setOpen] = useState(false);
  return (
    <RowActionGroup>
      <EditButton onClick={() => setOpen(true)} />
      <ThresholdDialog initial={row} templates={templates} open={open} onOpenChange={setOpen} />
      <DeleteButton name={`Ambang ${row.minPoints} poin`} action={() => deleteThreshold(row.id)} />
    </RowActionGroup>
  );
}
