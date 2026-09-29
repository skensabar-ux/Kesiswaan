"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canViewStudent, requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { runAction, UserError, type ActionResult } from "@/lib/action";

const schema = z.object({
  studentId: z.string().min(1),
  incidentId: z.string().optional(),
  note: z.string().trim().min(3, "Catatan minimal 3 karakter").max(2000),
});

/** Catatan tindak lanjut (mis. "sudah menghubungi ortu via telepon"). */
export async function addFollowUpNote(input: z.infer<typeof schema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireRole("ADMIN", "PKS", "WALI_KELAS", "BK");
    const d = schema.parse(input);
    if (!(await canViewStudent(me, d.studentId))) throw new UserError("Anda tidak berhak menambah catatan untuk siswa ini.");
    if (d.incidentId) {
      const link = await prisma.incidentStudent.findFirst({ where: { incidentId: d.incidentId, studentId: d.studentId }, select: { id: true } });
      if (!link) throw new UserError("Kejadian tidak terkait dengan siswa ini.");
    }
    const row = await prisma.followUpNote.create({ data: { studentId: d.studentId, incidentId: d.incidentId ?? null, authorId: me.id, note: d.note } });
    await audit({ userId: me.id, action: "CREATE", entity: "FollowUpNote", entityId: row.id, after: row });
    revalidatePath(`/siswa/${d.studentId}`);
    if (d.incidentId) revalidatePath(`/kejadian/${d.incidentId}`);
    return { ok: true, message: "Catatan tindak lanjut disimpan." };
  });
}
