"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { CheckboxField, FormField } from "@/components/form-field";
import { FormDialog } from "@/components/form-dialog";
import { DeleteButton, EditButton } from "@/components/row-actions";
import { handleResult } from "@/components/action-helpers";
import { teacherSchema } from "@/lib/validators/master";
import { deleteTeacher, saveTeacher } from "@/server/actions/master/teacher";

type V = z.infer<typeof teacherSchema>;
type Row = V & { id: string };

export function TeacherDialog({
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
    resolver: zodResolver(teacherSchema),
    defaultValues: initial ?? { nip: "", name: "", phone: "", isActive: true },
  });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await saveTeacher(initial?.id ?? null, v), f.setError)) {
      setOpen(false);
      if (!initial) f.reset();
      router.refresh();
    }
  });
  return (
    <FormDialog open={open} onOpenChange={setOpen} trigger={trigger} title={initial ? "Ubah Guru" : "Tambah Guru"} onSubmit={submit} submitting={f.formState.isSubmitting}>
      <FormField label="Nama lengkap (dengan gelar)" required error={e.name?.message}>
        <Input {...f.register("name")} />
      </FormField>
      <FormField label="NIP" error={e.nip?.message} hint="Kosongkan bila bukan PNS/PPPK.">
        <Input inputMode="numeric" {...f.register("nip")} />
      </FormField>
      <FormField label="No. HP/WA" error={e.phone?.message}>
        <Input inputMode="tel" placeholder="08xxxxxxxxxx" {...f.register("phone")} />
      </FormField>
      <CheckboxField label="Aktif" {...f.register("isActive")} />
    </FormDialog>
  );
}

export function TeacherRowActions({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <EditButton onClick={() => setOpen(true)} />
      <TeacherDialog initial={row} open={open} onOpenChange={setOpen} />
      <DeleteButton name={row.name} action={() => deleteTeacher(row.id)} />
    </div>
  );
}
