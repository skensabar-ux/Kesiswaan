"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { handleResult } from "@/components/action-helpers";
import { changePasswordSchema } from "@/lib/validators/auth";
import { changePassword } from "@/server/actions/auth";

type V = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm({ isParent }: { isParent: boolean }) {
  const f = useForm<V>({ resolver: zodResolver(changePasswordSchema) });
  const label = isParent ? "PIN" : "Password";
  const onSubmit = async (v: V) => {
    if (handleResult(await changePassword(v), f.setError)) {
      window.location.href = isParent ? "/ortu" : "/";
    }
  };
  const inputProps = isParent ? { inputMode: "numeric" as const, maxLength: 6 } : {};
  return (
    <form method="post" onSubmit={f.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label={`${label} lama`} error={f.formState.errors.currentPassword?.message}>
        <Input type="password" autoComplete="current-password" {...inputProps} {...f.register("currentPassword")} />
      </FormField>
      <FormField
        label={`${label} baru`}
        error={f.formState.errors.newPassword?.message}
        hint={isParent ? "6 digit angka." : "Minimal 8 karakter."}
      >
        <Input type="password" autoComplete="new-password" {...inputProps} {...f.register("newPassword")} />
      </FormField>
      <FormField label={`Ulangi ${label.toLowerCase()} baru`} error={f.formState.errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" {...inputProps} {...f.register("confirmPassword")} />
      </FormField>
      <Button type="submit" disabled={f.formState.isSubmitting}>
        {f.formState.isSubmitting && <Loader2 className="animate-spin" />} Simpan
      </Button>
    </form>
  );
}
