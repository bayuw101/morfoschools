import Link from "next/link";
import { validateCtaLinks, validateFeatureCompleteness, type LandingCta, type LandingFeature } from "./landing-domain";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileCheck2,
  Globe2,
  GraduationCap,
  Layers3,
  LineChart,
  LockKeyhole,
  RadioTower,
  School,
  ShieldCheck,
  Sparkles,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";

const stats = [
  { value: "10k+", label: "siswa serentak" },
  { value: "<80ms", label: "pencatatan jawaban" },
  { value: "99.95%", label: "target durabilitas ujian" },
];

const modules = [
  {
    icon: BookOpen,
    title: "Kelas & Materi",
    description: "Susun kelas, mapel, guru pengampu, modul belajar, dan lampiran YouTube/Drive tanpa membebani server sekolah.",
  },
  {
    icon: FileCheck2,
    title: "Ujian Anti Panik",
    description: "Eligibility dimaterialisasi saat publish, jawaban masuk ke inbox tahan lonjakan, dan proktor mendapat status real-time.",
  },
  {
    icon: LineChart,
    title: "Akademik & Insight",
    description: "Rekap nilai, aktivitas belajar, kehadiran digital, dan analitik performa kelas untuk keputusan kepala sekolah.",
  },
  {
    icon: Users,
    title: "Operasional Sekolah",
    description: "Manajemen tenant, pengguna, rombel, subject group, teaching assignment, dan enrollment dalam alur yang rapi.",
  },
];

const reliability = [
  "Jawaban siswa disimpan cepat di Postgres partitioned inbox",
  "NATS JetStream meredam lonjakan saat ribuan siswa submit bersamaan",
  "Exam critical path tidak bergantung pada Google, AI, atau analitik eksternal",
  "Dashboard operasional membantu admin melihat kelas, ujian, dan anomali",
];

const landingCtas: LandingCta[] = [
  { id: "login", label: "Masuk", href: "/login", primary: false },
  { id: "demo", label: "Coba Demo", href: "/login", primary: true },
  { id: "modules", label: "Jelajahi Modul", href: "#modules", primary: false },
];

const landingFeatures: LandingFeature[] = [
  { id: "modules", title: "Kelas & Materi", description: "Lifecycle konten belajar", section: "modules", criticalPathSafe: true },
  { id: "exam", title: "Ujian Anti Panik", description: "Critical path ujian terlindungi", section: "reliability", criticalPathSafe: true },
  { id: "workflow", title: "Operability first", description: "Alur nyata sekolah", section: "workflow", criticalPathSafe: true },
];

const ctaValidation = validateCtaLinks(landingCtas);
const featureValidation = validateFeatureCompleteness(landingFeatures, ["modules", "reliability", "workflow"]);

const workflow = [
  { step: "01", title: "Siapkan struktur sekolah", text: "Tenant, rombel, mata pelajaran, guru, dan siswa dibuat dengan validasi yang jelas." },
  { step: "02", title: "Publikasikan materi & ujian", text: "Guru menyusun konten, menentukan peserta eligible, lalu sistem mengunci snapshot ujian." },
  { step: "03", title: "Pantau pelaksanaan", text: "Proktor melihat status koneksi, submit, durasi, dan risiko operasional dari satu layar." },
];

function LogoMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--shell)] text-white shadow-xl shadow-[var(--brand)]/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(72%_0.18_255/.95),transparent_38%),radial-gradient(circle_at_80%_90%,oklch(72%_0.17_150/.65),transparent_42%)]" />
      <School className="relative z-10" size={24} strokeWidth={2.4} />
    </div>
  );
}

function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/60 bg-white/72 backdrop-blur-2xl">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Morfoschools home">
          <LogoMark />
          <div>
            <p className="font-display text-xl font-bold tracking-tight">Morfoschools</p>
            <p className="-mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">LMS Indonesia</p>
          </div>
        </Link>

        <div className="hidden items-center gap-8 rounded-full border border-[var(--border)] bg-white/70 px-6 py-3 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm lg:flex">
          <Link href="#modules" className="transition hover:text-[var(--foreground)]">Modul</Link>
          <Link href="#reliability" className="transition hover:text-[var(--foreground)]">Reliability</Link>
          <Link href="#workflow" className="transition hover:text-[var(--foreground)]">Workflow</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-subtle)] sm:inline-flex">
            Masuk
          </Link>
          <Link href="/login" className="group inline-flex items-center gap-2 rounded-full bg-[var(--shell)] px-5 py-3 text-sm font-bold text-white shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[var(--shell-elevated)]">
            Coba Demo
            <ArrowRight className="transition group-hover:translate-x-0.5" size={16} />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-6xl lg:mt-20">
      <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_20%_20%,oklch(62%_0.22_262/.24),transparent_35%),radial-gradient(circle_at_80%_10%,oklch(70%_0.17_150/.18),transparent_34%),radial-gradient(circle_at_50%_100%,oklch(72%_0.16_75/.18),transparent_42%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/72 p-3 shadow-2xl shadow-[var(--brand)]/10 backdrop-blur-xl lg:rounded-[2.5rem] lg:p-4">
        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[var(--shell)] text-white lg:rounded-[2rem]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-300" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-emerald-200 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Exam cluster healthy
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
            <aside className="hidden border-r border-white/10 bg-white/[0.03] p-5 lg:block">
              <div className="mb-7 flex items-center gap-3">
                <LogoMark />
                <div>
                  <p className="font-display font-bold">SMA Nusantara</p>
                  <p className="text-xs text-white/45">Operator dashboard</p>
                </div>
              </div>
              {[
                [Layers3, "Akademik", true],
                [FileCheck2, "Ujian Aktif", true],
                [RadioTower, "Proktor", false],
                [BarChart3, "Analitik", false],
              ].map(([Icon, label, active]) => {
                const TypedIcon = Icon as typeof Layers3;
                return (
                  <div key={label as string} className={`mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${active ? "bg-white/10 text-white" : "text-white/45"}`}>
                    <TypedIcon size={17} />
                    {label as string}
                  </div>
                );
              })}
            </aside>

            <main className="p-5 sm:p-7 lg:p-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-200/70">Ujian Semester • Live</p>
                  <h2 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">Matematika XII - Gelombang 1</h2>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
                  8.742 jawaban aman
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["Peserta online", "2.486", "+184 / menit"],
                  ["Inbox latency", "42ms", "stabil"],
                  ["Risk alerts", "03", "ditangani"],
                ].map(([label, value, hint]) => (
                  <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                    <p className="text-sm text-white/50">{label}</p>
                    <p className="mt-3 font-display text-3xl font-bold">{value}</p>
                    <p className="mt-2 text-xs font-bold text-blue-100/70">{hint}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <p className="font-bold">Throughput jawaban</p>
                    <p className="text-xs text-white/45">NATS JetStream relay</p>
                  </div>
                  <div className="flex h-36 items-end gap-2">
                    {[42, 58, 46, 72, 64, 88, 76, 93, 68, 84, 79, 96, 74, 89].map((height, index) => (
                      <div key={index} className="flex-1 rounded-t-xl bg-gradient-to-t from-blue-500 to-emerald-300 opacity-90" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                  <p className="mb-4 font-bold">Proctor queue</p>
                  {[
                    ["Ruang 12-A", "2 siswa reconnect"],
                    ["Lab 03", "sinkronisasi aman"],
                    ["Ruang 10-C", "1 anomali fokus"],
                  ].map(([room, text]) => (
                    <div key={room} className="mb-3 rounded-2xl bg-black/14 p-3">
                      <p className="text-sm font-bold">{room}</p>
                      <p className="text-xs text-white/45">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-32 sm:px-8 lg:pb-28 lg:pt-40">
      <div className="absolute left-1/2 top-0 -z-10 h-[760px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,oklch(92%_0.07_255/.85),transparent_62%)] blur-3xl" />
      <div className="mx-auto max-w-7xl text-center">
        <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/74 px-4 py-2 text-sm font-bold text-[var(--brand-strong)] shadow-sm backdrop-blur-xl">
            <Sparkles size={16} />
          {ctaValidation.valid && featureValidation.complete ? "LMS operasional untuk sekolah Indonesia — bukan sekadar kelas online" : "Landing metadata perlu dicek"}
        </div>
        <h1 className="mx-auto max-w-5xl font-display text-5xl font-extrabold tracking-[-0.06em] text-[var(--foreground)] sm:text-7xl lg:text-[92px] lg:leading-[0.94]">
          Sekolah digital yang tetap tenang saat ujian massal.
        </h1>
        <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-[var(--muted-foreground)] sm:text-xl">
          Morfoschools menyatukan LMS, manajemen akademik, ujian reliabel, dan dashboard operasional dalam satu platform premium yang realistis untuk infrastruktur sekolah Indonesia.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/login" className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-7 py-4 text-base font-extrabold text-white shadow-2xl shadow-[var(--brand)]/25 transition hover:-translate-y-1 hover:bg-[var(--brand-strong)] sm:w-auto">
            Masuk ke Demo Operasional
            <ChevronRight className="transition group-hover:translate-x-1" size={19} />
          </Link>
          <Link href="#modules" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-white/80 px-7 py-4 text-base font-extrabold text-[var(--foreground)] shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white sm:w-auto">
            Jelajahi Modul
          </Link>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/70 bg-white/58 p-5 shadow-sm backdrop-blur-xl">
              <p className="font-display text-3xl font-bold tracking-tight text-[var(--foreground)]">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">{item.label}</p>
            </div>
          ))}
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function Modules() {
  return (
    <section id="modules" className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--brand)]">Complete product lifecycle</p>
            <h2 className="max-w-3xl font-display text-4xl font-bold tracking-[-0.04em] sm:text-6xl">Dari login sampai operasional harian sekolah.</h2>
          </div>
          <p className="max-w-md text-lg leading-8 text-[var(--muted-foreground)]">
            Dibuat agar admin, guru, proktor, kepala sekolah, dan siswa punya alur yang jelas — bukan fitur teknis yang terpisah-pisah.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <article key={module.title} className="group relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--brand)]/10">
                <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-[var(--brand-soft)] blur-2xl transition group-hover:scale-150" />
                <div className="relative mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--shell)] text-white shadow-xl shadow-black/10">
                  <Icon size={25} />
                </div>
                <h3 className="relative font-display text-2xl font-bold tracking-tight">{module.title}</h3>
                <p className="relative mt-3 leading-7 text-[var(--muted-foreground)]">{module.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Reliability() {
  return (
    <section id="reliability" className="px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="rounded-[2.5rem] bg-[var(--shell)] p-8 text-white shadow-2xl shadow-black/10 sm:p-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-bold text-emerald-100">
            <ShieldCheck size={17} />
            Exam critical path protected
          </div>
          <h2 className="font-display text-4xl font-bold tracking-[-0.04em] sm:text-6xl">Didesain untuk hari terberat: ujian serentak.</h2>
          <p className="mt-6 text-lg leading-8 text-white/62">
            Infrastruktur Morfosis memakai pola shock absorber: tulis cepat, relay aman, proses bertahap. Saat koneksi sekolah tidak ideal, sistem tetap menjaga jawaban siswa.
          </p>

          <div className="mt-9 grid gap-3">
            {reliability.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={19} />
                <p className="font-semibold leading-6 text-white/82">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {[
            { icon: Zap, title: "Fast ingest", metric: "42ms", text: "Pencatatan jawaban dibuat ringan agar server VPS sekolah tidak panik." },
            { icon: WifiOff, title: "Resilient sync", metric: "0 lost", text: "Client dapat retry dan sistem menjaga idempotensi submit." },
            { icon: Database, title: "Partitioned inbox", metric: "daily", text: "Partisi harian membuat beban ujian besar tetap mudah dioperasikan." },
            { icon: LockKeyhole, title: "Integrity aware", metric: "audit", text: "Aktivitas penting tercatat untuk proktor dan investigasi pasca-ujian." },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-[2rem] border border-[var(--border)] bg-white/78 p-7 shadow-sm backdrop-blur-xl">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Icon size={22} />
                  </div>
                  <p className="font-display text-3xl font-bold tracking-tight text-[var(--foreground)]">{card.metric}</p>
                </div>
                <h3 className="font-display text-xl font-bold">{card.title}</h3>
                <p className="mt-2 leading-7 text-[var(--muted-foreground)]">{card.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section id="workflow" className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-[var(--border)] bg-white/70 p-6 shadow-sm backdrop-blur-xl sm:p-10">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.8fr_1fr] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--brand)]">Operability first</p>
            <h2 className="font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Alur nyata untuk sekolah, bukan demo kosong.</h2>
          </div>
          <p className="text-lg leading-8 text-[var(--muted-foreground)]">
            Morfoschools mengutamakan review operasional: admin bisa login, mengelola data, guru menyiapkan ujian, dan proktor memantau pelaksanaan.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {workflow.map((item) => (
            <div key={item.step} className="rounded-[2rem] bg-[var(--surface-subtle)] p-6">
              <p className="font-display text-5xl font-bold tracking-tight text-[var(--brand)]/24">{item.step}</p>
              <h3 className="mt-5 font-display text-2xl font-bold">{item.title}</h3>
              <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-5 py-24 sm:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[3rem] bg-[var(--shell)] px-6 py-16 text-center text-white shadow-2xl shadow-black/12 sm:px-12 lg:py-24">
        <div className="absolute left-0 top-0 h-80 w-80 -translate-x-1/3 -translate-y-1/3 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-56 w-[720px] -translate-x-1/2 translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 backdrop-blur">
          <GraduationCap size={30} />
        </div>
        <h2 className="relative mx-auto max-w-3xl font-display text-4xl font-bold tracking-[-0.04em] text-white sm:text-6xl">Bangun sekolah digital yang siap dipakai saat kondisi tidak ideal.</h2>
        <p className="relative mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/70">
          Mulai dari demo operasional: login, kelola kelas, susun akademik, dan rasakan bagaimana platform ini menjaga ujian tetap berjalan.
        </p>
        <div className="relative mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/login" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-extrabold text-[var(--shell)] transition hover:-translate-y-1 sm:w-auto">
            Masuk ke Demo
            <ArrowRight size={18} />
          </Link>
          <Link href="#reliability" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-7 py-4 font-extrabold text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/15 sm:w-auto">
            Lihat Reliability
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-white/76 px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="font-display font-bold">Morfoschools</p>
            <p className="text-sm text-[var(--muted-foreground)]">LMS SaaS untuk sekolah Indonesia.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-5 text-sm font-bold text-[var(--muted-foreground)]">
          <Link href="#modules" className="hover:text-[var(--foreground)]">Modul</Link>
          <Link href="#reliability" className="hover:text-[var(--foreground)]">Reliability</Link>
          <Link href="/login" className="hover:text-[var(--foreground)]">Login</Link>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden selection:bg-[var(--brand-soft)] selection:text-[var(--brand-strong)]">
      <Navbar />
      <main>
        <Hero />
        <Modules />
        <Reliability />
        <Workflow />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
