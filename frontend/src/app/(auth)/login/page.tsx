"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, KeyRound, Loader2, LockKeyhole, ServerCog, ShieldCheck, Sparkles } from "lucide-react";
import { createAuthApiClient, storeSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { Alert } from "@/components/ui/alert";
import { LogoLockup } from "@/components/ui/logo-lockup";

const DEMO_TENANT_ID = "00000000-0000-4000-8000-000000000001";

const demoAccounts = [
  { label: "Guru", email: "guru.biologi@morfosis.demo", role: "Monitor ujian & grading essay" },
  { label: "Siswa", email: "alya@morfosis.demo", role: "Exam gate, autosave, result" },
  { label: "Admin", email: "admin@morfosis.demo", role: "Operasional sekolah" },
];

export default function LoginPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = React.useState(DEMO_TENANT_ID);
  const [email, setEmail] = React.useState("guru.biologi@morfosis.demo");
  const [password, setPassword] = React.useState("morfosis123");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await createAuthApiClient().login({ tenantId, email, password });
      storeSession(session);
      router.push("/app");
    } catch (err) {
      const message = err instanceof Error ? err.message : "login_failed";
      setError(message === "invalid_credentials" ? "Email, password, atau tenant tidak sesuai." : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.22),transparent_34%),linear-gradient(135deg,#eef4f8_0%,#f9fbf7_52%,#e9f4ef_100%)] px-4 py-6 text-[color:var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative rounded-[40px] border border-white/70 bg-white/58 p-6 shadow-[0_32px_90px_rgba(28,45,67,0.18)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[color:var(--brand-soft)] blur-3xl" />
          <div className="relative">
            <LogoLockup />
            <div className="mt-14 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--brand-strong)]">
                <Sparkles className="h-4 w-4" /> Real auth foundation
              </div>
              <h1 className="mt-6 font-display text-5xl font-black leading-[0.95] tracking-[-0.055em] text-[color:var(--foreground)] sm:text-6xl lg:text-7xl">
                Masuk ke LMS yang siap ujian nasional sekolah.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[color:var(--muted-foreground)]">
                Session token sekarang berasal dari backend Go + PostgreSQL. Dev header tetap fallback, tapi user journey login sudah mulai nyata untuk guru, siswa, dan admin.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: "Tenant isolated", desc: "X-Tenant-ID tetap eksplisit." },
                { icon: ServerCog, title: "Low-spec ready", desc: "State disimpan di Postgres." },
                { icon: LockKeyhole, title: "Token session", desc: "Bearer token untuk API." },
              ].map((item) => (
                <div key={item.title} className="rounded-[28px] border border-white/70 bg-white/62 p-4 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"><item.icon className="h-5 w-5" /></div>
                  <p className="mt-4 text-sm font-extrabold text-[color:var(--foreground)]">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[40px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5 shadow-[0_30px_80px_rgba(9,17,28,0.18)] sm:p-7">
          <div className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">Secure sign in</p>
                <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.035em]">Masuk ke tenant sekolah</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">Gunakan akun demo atau kredensial sekolah.</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#486b9c_0%,#233754_100%)] text-white"><KeyRound className="h-5 w-5" /></div>
            </div>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <FloatingInput label="Tenant ID" value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
              <FloatingInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <FloatingInput label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              {error ? <Alert tone="error" title="Login gagal" description={error} /> : null}
              <Button type="submit" className="w-full justify-center" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {loading ? "Memvalidasi..." : "Masuk ke LMS"}
              </Button>
            </form>
          </div>

          <div className="mt-5 rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">Demo accounts</p>
            <div className="mt-3 space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => { setEmail(account.email); setPassword("morfosis123"); setTenantId(DEMO_TENANT_ID); }}
                  className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-transparent bg-[color:var(--surface)] px-4 py-3 text-left transition hover:border-[color:var(--border-strong)]"
                >
                  <div>
                    <p className="text-sm font-extrabold text-[color:var(--foreground)]">{account.label}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{account.email}</p>
                  </div>
                  <div className="hidden items-center gap-2 text-xs font-semibold text-[color:var(--brand-strong)] sm:flex"><CheckCircle2 className="h-4 w-4" /> {account.role}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
