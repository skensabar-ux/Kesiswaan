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
import { LETTER_PLACEHOLDERS, LETTER_TYPE_LABEL } from "@/lib/constants";
import { letterTemplateSchema } from "@/lib/validators/master";
import { deleteLetterTemplate, saveLetterTemplate } from "@/server/actions/master/letter-template";

type V = z.infer<typeof letterTemplateSchema>;
type Row = V & { id: string };

export function LetterTemplateDialog({
  initial,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  initial?: Row;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const router = useRouter();
  const f = useForm<V>({
    resolver: zodResolver(letterTemplateSchema),
    defaultValues: initial ?? { code: "", name: "", type: "PANGGILAN_1", body: "", isActive: true },
  });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await saveLetterTemplate(initial?.id ?? null, v), f.setError)) {
      setOpen(false);
      if (!initial) f.reset();
      router.refresh();
    }
  });
  const insert = (ph: string) => {
    const el = document.getElementById("tpl-body") as HTMLTextAreaElement | null;
    const cur = f.getValues("body") ?? "";
    const pos = el?.selectionStart ?? cur.length;
    f.setValue("body", cur.slice(0, pos) + ph + cur.slice(pos), { shouldDirty: true });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos + ph.length, pos + ph.length);
    });
  };
  const body = f.register("body");
  return (
    <FormDialog open={open} onOpenChange={setOpen} trigger={trigger} title={initial ? "Ubah Template Surat" : "Tambah Template Surat"} onSubmit={submit} submitting={f.formState.isSubmitting} wide>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Kode" required error={e.code?.message}>
          <Input placeholder="SP1" {...f.register("code")} />
        </FormField>
        <FormField label="Nama" required error={e.name?.message} className="sm:col-span-2">
          <Input {...f.register("name")} />
        </FormField>
      </div>
      <FormField label="Jenis surat" required error={e.type?.message}>
        <Select {...f.register("type")}>
          {Object.entries(LETTER_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Isi surat" required error={e.body?.message} hint="Klik placeholder untuk menyisipkan. Baris kosong = paragraf baru.">
        <div className="mb-1 flex flex-wrap gap-1">
          {LETTER_PLACEHOLDERS.map((p) => (
            <button key={p} type="button" onClick={() => insert(p)} className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] hover:bg-accent">
              {p}
            </button>
          ))}
        </div>
        <Textarea id="tpl-body" rows={14} className="font-mono text-xs" {...body} />
      </FormField>
      <CheckboxField label="Aktif" {...f.register("isActive")} />
    </FormDialog>
  );
}

export function LetterTemplateRowActions({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <EditButton onClick={() => setOpen(true)} />
      <LetterTemplateDialog initial={row} open={open} onOpenChange={setOpen} />
      <DeleteButton name={row.name} action={() => deleteLetterTemplate(row.id)} />
    </div>
  );
}
