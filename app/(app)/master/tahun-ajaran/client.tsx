"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CheckboxField, FormField } from "@/components/form-field";
import { FormDialog } from "@/components/form-dialog";
import { DeleteButton, EditButton } from "@/components/row-actions";
import { handleResult } from "@/components/action-helpers";
import { academicYearSchema } from "@/lib/validators/master";
import { deleteAcademicYear, saveAcademicYear } from "@/server/actions/master/academic-year";

type V = z.infer<typeof academicYearSchema>;
type Row = V & { id: string };

export function AcademicYearDialog({
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
    resolver: zodResolver(academicYearSchema),
    defaultValues: initial ?? { name: "", semester: "GANJIL", startDate: "", endDate: "", isActive: false },
  });
  const e = f.formState.errors;

  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await saveAcademicYear(initial?.id ?? null, v), f.setError)) {
      setOpen(false);
      if (!initial) f.reset();
      router.refresh();
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={initial ? "Ubah Tahun Ajaran" : "Tambah Tahun Ajaran"}
      onSubmit={submit}
      submitting={f.formState.isSubmitting}
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tahun Ajaran" required error={e.name?.message}>
          <Input placeholder="2026/2027" {...f.register("name")} />
        </FormField>
        <FormField label="Semester berjalan" required error={e.semester?.message}>
          <Select {...f.register("semester")}>
            <option value="GANJIL">Ganjil</option>
            <option value="GENAP">Genap</option>
          </Select>
        </FormField>
        <FormField label="Tanggal mulai" error={e.startDate?.message}>
          <Input type="date" {...f.register("startDate")} />
        </FormField>
        <FormField label="Tanggal selesai" error={e.endDate?.message}>
          <Input type="date" {...f.register("endDate")} />
        </FormField>
      </div>
      <CheckboxField
        label="Jadikan tahun ajaran aktif"
        description="Tahun ajaran lain otomatis dinonaktifkan. Poin siswa dihitung dari tahun ajaran aktif."
        {...f.register("isActive")}
      />
    </FormDialog>
  );
}

export function AcademicYearRowActions({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <EditButton onClick={() => setOpen(true)} />
      <AcademicYearDialog initial={row} open={open} onOpenChange={setOpen} />
      {!row.isActive && <DeleteButton name={row.name} action={() => deleteAcademicYear(row.id)} />}
    </div>
  );
}
