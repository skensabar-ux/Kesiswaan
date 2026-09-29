import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cron";
import { processWaQueue } from "@/lib/wa/queue";

export const dynamic = "force-dynamic";

/** Dipanggil Cron Job cPanel tiap 1–5 menit: memproses antrean WhatsApp secara bertahap. */
async function handler(req: Request) {
  if (!isValidCronRequest(req)) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  const result = await processWaQueue(Number(new URL(req.url).searchParams.get("limit")) || 20);
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}

export const GET = handler;
export const POST = handler;
