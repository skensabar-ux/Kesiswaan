import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requestMeta } from "@/lib/request";

type AuditInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

const SENSITIVE = new Set(["passwordHash", "password", "pin"]);

function clean(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (v === undefined || v === null) return Prisma.JsonNull;
  return JSON.parse(
    JSON.stringify(v, (k, val) => (SENSITIVE.has(k) ? "[disembunyikan]" : val)),
  ) as Prisma.InputJsonValue;
}

/** Catat audit log. Tidak pernah melempar error agar tidak menggagalkan aksi utama. */
export async function audit(input: AuditInput, tx: Prisma.TransactionClient = prisma) {
  try {
    const meta = await requestMeta().catch(() => ({ ip: null, userAgent: null }));
    await tx.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: clean(input.before),
        after: clean(input.after),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  } catch (e) {
    console.error("[audit] gagal mencatat", e);
  }
}
