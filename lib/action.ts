import "server-only";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/rbac";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export class UserError extends Error {}

/** Bungkus server action agar error berubah menjadi pesan yang ramah pengguna. */
export async function runAction<T = undefined>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    return toErrorResult(e);
  }
}

export function toErrorResult(e: unknown): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  if (e instanceof ZodError) {
    return {
      ok: false,
      error: e.issues[0]?.message ?? "Data tidak valid.",
      fieldErrors: e.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  if (e instanceof ForbiddenError || e instanceof UserError) return { ok: false, error: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const target = (e.meta?.target as string[] | string | undefined)?.toString() ?? "";
      return { ok: false, error: `Data duplikat${target ? ` (${target})` : ""} — nilai tersebut sudah dipakai.` };
    }
    if (e.code === "P2003" || e.code === "P2014") {
      return { ok: false, error: "Data tidak dapat dihapus karena masih dipakai oleh data lain." };
    }
    if (e.code === "P2025") return { ok: false, error: "Data tidak ditemukan." };
  }
  // NEXT_REDIRECT dsb harus dilempar ulang
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
  console.error("[action]", e);
  return { ok: false, error: "Terjadi kesalahan pada server. Silakan coba lagi." };
}
