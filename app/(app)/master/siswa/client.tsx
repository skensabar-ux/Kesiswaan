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
import { studentSchema } from "@/lib/validators/master";
import { deleteStudent, saveStudent } from "@/server/actions/master/student";
import { RowActionGroup } from "@/components/row-action-group";

type V = z.infer<typeof studentSchema>;
type Row = V & { id: string };
type ClassOpt = { id: string; name: string };

export function StudentDialog({
  initial,
  classes,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  initial?: Row;
  classes: ClassOpt[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const router = useRouter();
  const f = useForm<V>({
    resolver: zodResolver(studentSchema),
    defaultValues: initial ?? { nisn: "", nis: "", name: "", gender: undefined, birthDate: "", classId: "", address: "", isActive: true },
  });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await saveStudent(initial?.id ?? null, v), f.setError)) {
      setOpen(false);
      if (!initial) f.reset();
      router.refresh();
    }
  });
  return (
    <FormDialog open={open} onOpenChange={setOpen} trigger={trigger} title={initial ? "Ubah Siswa" : "Tambah Siswa"} onSubmit={submit} submitting={f.formState.isSubmitting}>
      <FormField label="Nama lengkap" required error={e.name?.message}>
        <Input {...f.register("name")} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="NISN" required error={e.nisn?.message}>
          <Input inputMode="numeric" maxLength={10} {...f.register("nisn")} />
        </FormField>
        <FormField label="NIS" error={e.nis?.message}>
          <Input {...f.register("nis")} />
        </FormField>
        <FormField label="Jenis kelamin" required error={e.gender?.message}>
          <Select {...f.register("gender")}>
            <option value="">— Pilih —</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </Select>
        </FormField>
        <FormField label="Tanggal lahir" error={e.birthDate?.message}>
          <Input type="date" {...f.register("birthDate")} />
        </FormField>
      </div>
      <FormField label="Kelas" error={e.classId?.message}>
        <Select {...f.register("classId")}>
          <option value="">— Tanpa kelas —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Alamat" error={e.address?.message}>
        <Textarea rows={2} {...f.register("address")} />
      </FormField>
      <CheckboxField label="Siswa aktif" description="Nonaktifkan untuk siswa lulus/pindah/keluar." {...f.register("isActive")} />
    </FormDialog>
  );
}

export function StudentRowActions({ row, classes }: { row: Row; classes: ClassOpt[] }) {
  const [open, setOpen] = useState(false);
  return (
    <RowActionGroup>
      <EditButton onClick={() => setOpen(true)} />
      <StudentDialog initial={row} classes={classes} open={open} onOpenChange={setOpen} />
      <DeleteButton name={row.name} action={() => deleteStudent(row.id)} />
    </RowActionGroup>
  );
}
