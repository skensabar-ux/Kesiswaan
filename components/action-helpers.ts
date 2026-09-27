"use client";

import { toast } from "sonner";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export type ClientActionResult<T = unknown> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Tampilkan toast untuk hasil server action & petakan error per field ke react-hook-form. */
export function handleResult<F extends FieldValues>(
  res: ClientActionResult,
  setError?: UseFormSetError<F>,
): boolean {
  if (res.ok) {
    if (res.message) toast.success(res.message);
    return true;
  }
  toast.error(res.error);
  if (setError && res.fieldErrors) {
    for (const [k, msgs] of Object.entries(res.fieldErrors)) {
      if (msgs?.[0]) setError(k as Path<F>, { message: msgs[0] });
    }
  }
  return false;
}
