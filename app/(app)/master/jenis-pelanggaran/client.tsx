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
import { violationTypeSchema } from "@/lib/validators/master";
import { deleteViolationType, saveViolationType } from "@/server/actions/master/violation-type";
import { RowActionGroup } from "@/components/row-action-group";

type V = z.infer<typeof violationTypeSchema>;
type Row = V & { id: string };
type Cat = { id: string; name: string };

export function ViolationTypeDialog({
  initial,
  categories,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  initial?: Row;
  categories: Cat[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const router = useRouter();
  const f = useForm<V>({
    resolver: zodResolver(violationTypeSchema),
    defaultValues: initial ?? { code: "", name: "", categoryId: categories[0]?.id ?? "", points: 5, description: "", isActive: true },
  });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await saveViolationType(initial?.id ?? null, v), f.setError)) {
      setOpen(false);
      if (!initial) f.reset();
      router.refresh();
    }
  });
  return (
    <FormDialog open={open} onOpenChange={setOpen} trigger={trigger} title={initial ? "Ubah Jenis Pelanggaran" : "Tambah Jenis Pelanggaran"} onSubmit={submit} submitting={f.formState.isSubmitting}>
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Kode" required error={e.code?.message}>
          <Input placeholder="R01" {...f.register("code")} />
        </FormField>
        <FormField label="Nama pelanggaran" required error={e.name?.message} className="col-span-2">
          <Input {...f.register("name")} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Kategori" required error={e.categoryId?.message}>
          <Select {...f.register("categoryId")}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Poin" required error={e.points?.message}>
          <Input type="number" min={0} inputMode="numeric" {...f.register("points", { valueAsNumber: true })} />
        </FormField>
      </div>
      <FormField label="Deskripsi" error={e.description?.message}>
        <Textarea rows={2} {...f.register("description")} />
      </FormField>
      <CheckboxField label="Aktif" description="Jenis nonaktif tidak muncul di form pencatatan." {...f.register("isActive")} />
    </FormDialog>
  );
}

export function ViolationTypeRowActions({ row, categories }: { row: Row; categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  return (
    <RowActionGroup>
      <EditButton onClick={() => setOpen(true)} />
      <ViolationTypeDialog initial={row} categories={categories} open={open} onOpenChange={setOpen} />
      <DeleteButton name={row.name} action={() => deleteViolationType(row.id)} />
    </RowActionGroup>
  );
}
