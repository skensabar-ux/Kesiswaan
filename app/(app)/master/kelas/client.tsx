"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { FormDialog } from "@/components/form-dialog";
import { DeleteButton, EditButton } from "@/components/row-actions";
import { handleResult } from "@/components/action-helpers";
import { classSchema } from "@/lib/validators/master";
import { deleteClass, saveClass } from "@/server/actions/master/class";

type V = z.infer<typeof classSchema>;
type Row = V & { id: string };
type Options = { years: { id: string; name: string }[]; teachers: { id: string; name: string }[]; defaultYearId: string };

export function ClassDialog({
  initial,
  options,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  initial?: Row;
  options: Options;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const router = useRouter();
  const f = useForm<V>({
    resolver: zodResolver(classSchema),
    defaultValues: initial ?? { name: "", major: "", grade: 10, waliKelasId: "", academicYearId: options.defaultYearId },
  });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await saveClass(initial?.id ?? null, v), f.setError)) {
      setOpen(false);
      if (!initial) f.reset();
      router.refresh();
    }
  });
  return (
    <FormDialog open={open} onOpenChange={setOpen} trigger={trigger} title={initial ? "Ubah Kelas" : "Tambah Kelas"} onSubmit={submit} submitting={f.formState.isSubmitting}>
      <FormField label="Nama kelas" required error={e.name?.message} hint="Contoh: XI TKJ 1">
        <Input {...f.register("name")} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Jurusan" required error={e.major?.message} hint="Contoh: TKJ">
          <Input {...f.register("major")} />
        </FormField>
        <FormField label="Tingkat" required error={e.grade?.message}>
          <Select {...f.register("grade", { valueAsNumber: true })}>
            <option value={10}>X (10)</option>
            <option value={11}>XI (11)</option>
            <option value={12}>XII (12)</option>
            <option value={13}>XIII (13)</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Wali kelas" error={e.waliKelasId?.message}>
        <Select {...f.register("waliKelasId")}>
          <option value="">— Belum ditentukan —</option>
          {options.teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Tahun ajaran" required error={e.academicYearId?.message}>
        <Select {...f.register("academicYearId")}>
          <option value="">— Pilih —</option>
          {options.years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </Select>
      </FormField>
    </FormDialog>
  );
}

export function ClassRowActions({ row, options }: { row: Row; options: Options }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <EditButton onClick={() => setOpen(true)} />
      <ClassDialog initial={row} options={options} open={open} onOpenChange={setOpen} />
      <DeleteButton name={row.name} action={() => deleteClass(row.id)} />
    </div>
  );
}
