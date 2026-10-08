import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  HeartHandshake,
  History,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { homePathFor } from "@/lib/roles";
import { Reveal } from "@/components/motion/reveal";

export const metadata = { title: "Beranda" };

const FEATURES = [
  { icon: ClipboardList, title: "Catat kejadian dalam 1 menit", text: "Guru melapor dari HP: pilih siswa, jenis pelanggaran, lokasi, dan foto bukti. PKS memverifikasi sebelum poin dihitung." },
  { icon: ShieldCheck, title: "Poin & ambang otomatis", text: "Poin dijumlahkan per tahun ajaran. Saat ambang tercapai, wali kelas dan BK langsung diberi tahu, sekali saja." },
  { icon: HeartHandshake, title: "Pendampingan BK", text: "Kasus terbuka otomatis untuk pelanggaran berat. Jadwal sesi, catatan rahasia, dan timeline dalam satu halaman." },
  { icon: QrCode, title: "Surat panggilan ber-QR", text: "Nomor surat otomatis, PDF berkop sekolah, dan kode QR untuk cek keaslian. SP III menunggu persetujuan Kepala Sekolah." },
  { icon: BellRing, title: "Notifikasi WhatsApp", text: "Orang tua menerima undangan dan mengonfirmasi kehadiran lewat tautan, tanpa perlu memasang aplikasi." },
  { icon: FileSpreadsheet, title: "Laporan siap rapat", text: "Rekap per jenis, kelas, jurusan, dan siswa. Unduh sebagai Excel atau PDF dengan satu klik." },
];

const STEPS = [
  { who: "Guru", title: "Melapor", text: "Kejadian dicatat lengkap dengan kronologi dan bukti." },
  { who: "PKS", title: "Memverifikasi", text: "Laporan dicek; poin masuk ke akumulasi siswa." },
  { who: "BK", title: "Mendampingi", text: "Sesi konseling dan surat panggilan bila perlu." },
  { who: "Orang tua", title: "Terlibat", text: "Melihat perkembangan anak dan hadir di sekolah." },
];

const ROLES = [
  { role: "Guru", text: "Melapor kejadian dari kelas atau lapangan." },
  { role: "PKS Kesiswaan", text: "Verifikasi laporan, pantau tren, unduh laporan." },
  { role: "Wali Kelas", text: "Pantau poin siswa di kelasnya, terima notifikasi." },
  { role: "Guru BK", text: "Kelola kasus, sesi, surat, dan kalender BK." },
  { role: "Kepala Sekolah", text: "Ringkasan sekolah dan persetujuan surat." },
  { role: "Orang Tua", text: "Masuk dengan NISN + PIN, lihat poin & surat." },
];

const TONE: Record<string, string> = {
  amber: "bg-amber-400",
  red: "bg-rose-500",
  green: "bg-emerald-500",
};

export default async function LandingPage() {
  const [session, settings, thresholds] = await Promise.all([
    auth(),
    getSettings(),
    prisma.sanctionThreshold.findMany({ orderBy: { minPoints: "asc" }, select: { minPoints: true, action: true, color: true } }),
  ]);
  const loggedIn = Boolean(session?.user);
  const home = session?.user ? homePathFor(session.user.role) : "/login";
  const maxPoints = Math.max(150, ...thresholds.map((t) => t.minPoints));

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background">
      {/* ───── Navigasi ───── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/beranda" className="flex min-w-0 items-center gap-2.5">
            {settings.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${settings.logoPath}`} alt="" className="size-9 rounded-xl object-contain" />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-2 font-extrabold text-white shadow-md shadow-primary/30">K</span>
            )}
            <span className="min-w-0 leading-tight">
              <span className="block text-sm font-extrabold tracking-tight">Kesiswaan</span>
              <span className="block truncate text-xs text-muted-foreground">{settings.schoolName}</span>
            </span>
          </Link>
          <div className="ml-auto hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#fitur" className="hover:text-foreground">Fitur</a>
            <a href="#alur" className="hover:text-foreground">Alur</a>
            <a href="#peran" className="hover:text-foreground">Untuk siapa</a>
            <a href="#keamanan" className="hover:text-foreground">Keamanan</a>
          </div>
          <Link
            href={home}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-b from-primary to-primary/90 px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:brightness-110 md:ml-0"
          >
            {loggedIn ? "Buka dashboard" : "Masuk"} <ArrowRight className="size-4" />
          </Link>
        </nav>
      </header>

      {/* ───── Hero ───── */}
      <section className="relative">
        <div className="animate-drift pointer-events-none absolute -left-32 -top-24 size-[28rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="animate-drift pointer-events-none absolute -right-24 top-40 size-[24rem] rounded-full bg-brand-3/25 blur-3xl [animation-delay:-6s]" />
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-28">
          <div className="flex flex-col items-start gap-6">
            <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Sistem Informasi Kesiswaan · {settings.schoolName}
            </span>
            <h1 className="animate-rise text-4xl font-extrabold leading-[1.08] tracking-tight text-balance [--i:1] sm:text-5xl lg:text-6xl">
              Kedisiplinan tercatat rapi, <span className="text-gradient">pembinaan lebih cepat.</span>
            </h1>
            <p className="animate-rise max-w-xl text-lg text-muted-foreground [--i:2]">
              Dari laporan guru, verifikasi PKS, pendampingan BK, sampai surat panggilan yang dikonfirmasi orang tua lewat WhatsApp. Semua di satu tempat, bisa dibuka dari HP.
            </p>
            <div className="animate-rise flex flex-wrap gap-3 [--i:3]">
              <Link
                href={home}
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-primary to-primary/90 px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:brightness-110"
              >
                {loggedIn ? "Buka dashboard" : "Masuk Guru / Staf"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              {!loggedIn && (
                <Link
                  href="/login?peran=ortu"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-input bg-card px-6 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <Smartphone className="size-4 text-primary" /> Portal Orang Tua
                </Link>
              )}
            </div>
            <ul className="animate-rise flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground [--i:4]">
              {["Tanpa instal aplikasi", "Zona waktu WITA", "Data tersimpan di server sekolah"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Pratinjau aplikasi */}
          <div className="animate-rise relative [--i:2]">
            <div className="relative rounded-2xl border border-border/70 bg-card p-2 shadow-2xl shadow-primary/15 lg:rotate-[1.5deg]">
              <div className="mb-2 flex items-center gap-1.5 px-2 pt-1">
                <span className="size-2.5 rounded-full bg-rose-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/dashboard.webp" width={1200} height={760} alt="Tampilan dashboard Kesiswaan" className="w-full rounded-xl border border-border/60" fetchPriority="high" />
            </div>
            <div className="absolute -bottom-10 -left-4 w-[34%] max-w-44 rounded-[1.6rem] border-4 border-foreground/85 bg-card p-1 shadow-2xl sm:-left-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/portal-ortu.webp" width={390} height={780} alt="Portal orang tua di HP" loading="lazy" decoding="async" className="w-full rounded-[1.2rem]" />
            </div>
            <div className="animate-float absolute -right-2 top-8 hidden rounded-2xl border border-border/70 bg-card/95 px-4 py-3 shadow-xl backdrop-blur sm:block">
              <p className="text-xs text-muted-foreground">Surat Panggilan I</p>
              <p className="flex items-center gap-1.5 text-sm font-bold">
                <CheckCircle2 className="size-4 text-primary" /> Orang tua konfirmasi hadir
              </p>
            </div>
            <div className="animate-float absolute -bottom-4 right-6 hidden rounded-2xl border border-border/70 bg-card/95 px-4 py-3 shadow-xl backdrop-blur [animation-delay:-3s] sm:block">
              <p className="text-xs text-muted-foreground">Ambang 50 poin tercapai</p>
              <p className="text-sm font-bold">Kasus BK dibuka otomatis</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Fitur ───── */}
      <section id="fitur" className="scroll-mt-20 border-t border-border/60 bg-card/50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Fitur</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-balance md:text-4xl">Semua yang dibutuhkan tim kesiswaan, tanpa tumpukan kertas.</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i % 3}>
                <article className="group h-full rounded-2xl border border-border/70 bg-card p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-brand-2 text-white shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Alur ───── */}
      <section id="alur" className="scroll-mt-20 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Alur pembinaan</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-balance md:text-4xl">Dari laporan sampai orang tua hadir di sekolah.</h2>
          </Reveal>
          <ol className="relative mt-12 grid gap-6 md:grid-cols-4">
            <div className="absolute left-6 right-6 top-6 hidden h-0.5 bg-gradient-to-r from-primary via-brand-2 to-brand-3 md:block" />
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i}>
                <li className="relative flex gap-4 md:flex-col">
                  <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-brand-2 text-lg font-extrabold text-white shadow-lg shadow-primary/30 ring-4 ring-background">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">{s.who}</p>
                    <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>

          {thresholds.length > 0 && (
            <Reveal className="mt-16">
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-bold">Ambang sanksi {settings.schoolName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Tindakan otomatis saat akumulasi poin siswa dalam satu tahun ajaran mencapai batas berikut.</p>
                  </div>
                </div>
                <div className="mt-8 overflow-x-auto pb-2">
                  <div className="relative min-w-[40rem] px-2 pb-2">
                    <div className="mx-[6%] h-3 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500" />
                    <div className="relative mt-3 h-24">
                      {thresholds.map((t) => (
                        <div
                          key={t.minPoints}
                          className="absolute top-0 flex w-36 -translate-x-1/2 flex-col items-center text-center"
                          style={{ left: `${6 + (t.minPoints / maxPoints) * 88}%` }}
                        >
                          <span className={`size-3 -translate-y-[1.35rem] rounded-full ring-4 ring-card ${TONE[t.color] ?? "bg-primary"}`} />
                          <span className="-mt-2 text-lg font-extrabold tabular-nums">{t.minPoints}</span>
                          <span className="text-xs leading-snug text-muted-foreground">{t.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ───── Peran ───── */}
      <section id="peran" className="scroll-mt-20 border-t border-border/60 bg-card/50 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Untuk siapa</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-balance md:text-4xl">Setiap orang melihat yang perlu ia kerjakan.</h2>
            <p className="mt-4 text-muted-foreground">Menu dan data menyesuaikan peran. Guru tidak melihat catatan konseling; orang tua hanya melihat data anaknya sendiri.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/profil-siswa.webp"
              width={1200}
              height={760}
              alt="Profil siswa: total poin, ambang yang tercapai, grafik per bulan, dan riwayat kejadian"
              loading="lazy"
              decoding="async"
              className="mt-8 w-full rounded-2xl border border-border/70 shadow-xl shadow-primary/10"
            />
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((r, i) => (
              <Reveal key={r.role} delay={i % 2}>
                <div className="flex h-full gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-card transition hover:border-primary/30">
                  <UsersRound className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-bold">{r.role}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Keamanan ───── */}
      <section id="keamanan" className="scroll-mt-20 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="bg-brand relative overflow-hidden rounded-[2rem] p-8 text-white shadow-2xl shadow-primary/25 md:p-12">
              <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_75%)]" />
              <div className="animate-drift pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-brand-3/40 blur-3xl" />
              <div className="relative grid gap-10 lg:grid-cols-[1fr_1.2fr]">
                <div>
                  <LockKeyhole className="size-10" />
                  <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-balance md:text-4xl">Data anak dijaga, setiap perubahan tercatat.</h2>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {[
                    { icon: LockKeyhole, t: "Akun terkunci 15 menit setelah 5 kali salah password." },
                    { icon: ShieldCheck, t: "Catatan konseling hanya bisa dibaca Guru BK." },
                    { icon: History, t: "Audit log: siapa mengubah apa, kapan, dan dari mana." },
                    { icon: QrCode, t: "Surat dapat dicek keasliannya lewat kode QR." },
                  ].map(({ icon: Icon, t }) => (
                    <li key={t} className="flex gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                      <Icon className="mt-0.5 size-5 shrink-0" />
                      <span className="text-sm text-white/90">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───── Ajakan ───── */}
      <section className="pb-24">
        <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-balance md:text-4xl">Siap memulai?</h2>
          <p className="mt-3 text-muted-foreground">Guru dan staf masuk dengan username dari sekolah. Orang tua masuk dengan NISN anak dan PIN.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={home}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-primary to-primary/90 px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              {loggedIn ? "Buka dashboard" : "Masuk Guru / Staf"} <ArrowRight className="size-4" />
            </Link>
            {!loggedIn && (
              <Link href="/login?peran=ortu" className="inline-flex h-12 items-center gap-2 rounded-xl border border-input bg-card px-6 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40">
                <Smartphone className="size-4 text-primary" /> Portal Orang Tua
              </Link>
            )}
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border/60 bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {settings.schoolName}
            {settings.address ? ` · ${settings.address}` : ""}
          </p>
          <p>Sistem Informasi Kesiswaan</p>
        </div>
      </footer>
    </div>
  );
}
