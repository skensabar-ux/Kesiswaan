import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { homePathFor } from "@/lib/roles";
import { sp } from "@/lib/utils";
import { BellRing, ClipboardList, HeartHandshake } from "lucide-react";
import { LoginForm } from "./login-form";

const FEATURES = [
  { icon: ClipboardList, text: "Pencatatan kejadian & poin siswa" },
  { icon: HeartHandshake, text: "Kasus, sesi, dan surat panggilan BK" },
  { icon: BellRing, text: "Notifikasi ke wali kelas & orang tua" },
];

export const metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (session?.user) {
    const active = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isActive: true } });
    if (active?.isActive) redirect(homePathFor(session.user.role));
  }
  const [settings, params] = await Promise.all([getSettings(), searchParams]);
  const disabled = sp(params.error) === "nonaktif";
  const logo = settings.logoPath ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/files/${settings.logoPath}`} alt="Logo sekolah" className="size-14 rounded-2xl bg-white object-contain p-1.5" />
  ) : (
    <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-brand-2 text-2xl font-extrabold text-white shadow-lg shadow-primary/30">
      K
    </div>
  );
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel merek (layar lebar) */}
      <section className="bg-brand relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(80%_70%_at_30%_40%,black,transparent)]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full border-[48px] border-white/10" />
        <div className="relative flex items-center gap-3">
          {settings.logoPath ? logo : <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 text-xl font-extrabold ring-1 ring-white/30">K</div>}
          <div className="leading-tight">
            <p className="font-extrabold">Kesiswaan</p>
            <p className="text-sm text-white/75">{settings.schoolName}</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">Membina siswa, bersama-sama.</h2>
          <p className="mt-4 text-white/80">Satu tempat untuk mencatat kejadian, memantau poin, dan mendampingi siswa melalui Bimbingan Konseling.</p>
          <ul className="mt-8 flex flex-col gap-3 text-sm">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} {settings.schoolName}</p>
      </section>

      {/* Formulir */}
      <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-8">
        <div className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-brand-2/15 blur-3xl lg:hidden" />
        <div className="relative w-full max-w-sm">
          <div className="mb-7 flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <div className="lg:hidden">{logo}</div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Selamat datang 👋</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Masuk ke Sistem Informasi Kesiswaan <span className="lg:hidden">{settings.schoolName}</span>
              </p>
            </div>
          </div>
          {disabled && (
            <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive">
              Akun Anda dinonaktifkan. Hubungi administrator sekolah.
            </p>
          )}
          <LoginForm callbackUrl={sp(params.callbackUrl)} otpEnabled={settings.parentOtpEnabled && settings.waEnabled} defaultTab={sp(params.peran) === "ortu" ? "parent" : "staff"} />
          <p className="mt-6 text-center text-sm text-muted-foreground lg:text-left">
            <Link href="/beranda" className="font-medium text-primary hover:underline">
              ← Kembali ke beranda
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
