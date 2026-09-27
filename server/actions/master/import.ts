"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";
import { commitStudentRows, parseStudentWorkbook, type ImportReport } from "@/lib/import/students";

const MAX_BYTES = 5 * 1024 * 1024;

/** mode "preview": hanya validasi. mode "commit": simpan baris yang valid. */
export async function importStudents(formData: FormData): Promise<ActionResult<ImportReport>> {
  return runAction<ImportReport>(async () => {
    const me = await requireRole("ADMIN");
    const file = formData.get("file");
    const mode = formData.get("mode") === "commit" ? "commit" : "preview";
    if (!(file instanceof File) || file.size === 0) throw new UserError("Pilih file Excel (.xlsx).");
    if (file.size > MAX_BYTES) throw new UserError("Ukuran file maksimal 5 MB.");
    const buf = await file.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 4));
    if (!(head[0] === 0x50 && head[1] === 0x4b)) throw new UserError("File harus berformat .xlsx (Excel 2007+).");

    let parsed;
    try {
      parsed = await parseStudentWorkbook(buf);
    } catch {
      throw new UserError("File Excel tidak dapat dibaca. Gunakan template yang disediakan.");
    }
    const { rows, errors, totalRows } = parsed;
    if (totalRows === 0) throw new UserError("Tidak ada baris data di file.");

    if (mode === "preview") {
      return { ok: true, data: { totalRows, valid: rows.length, errors, committed: false } };
    }

    const result = await commitStudentRows(rows);
    await audit({
      userId: me.id,
      action: "IMPORT",
      entity: "Student",
      after: { file: file.name, totalRows, created: result.created, updated: result.updated, parentsCreated: result.parentsCreated, errors: errors.length + result.errors.length },
    });
    revalidatePath("/master/siswa");
    revalidatePath("/master/ortu");
    return {
      ok: true,
      message: `Import selesai: ${result.created} siswa baru, ${result.updated} diperbarui.`,
      data: {
        totalRows,
        valid: rows.length - result.errors.length,
        errors: [...errors, ...result.errors].sort((a, b) => a.row - b.row),
        created: result.created,
        updated: result.updated,
        parentsCreated: result.parentsCreated,
        committed: true,
      },
    };
  });
}
