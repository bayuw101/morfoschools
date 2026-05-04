"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FloatingInput } from "@/components/ui/floating-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { GraduationCap, LockKeyhole, Mail } from "lucide-react";
import { getPostLoginRedirect, loginSchema, type LoginForm } from "./login-domain";

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "guru@morfosis.local", password: "morfosis123" },
  });

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    router.push(getPostLoginRedirect("admin"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--shell)] p-4">
      <div className="w-full max-w-[1080px] overflow-hidden rounded-[34px] border border-white/10 bg-[color:var(--surface)] shadow-[0_34px_90px_rgba(4,10,20,0.42)] md:grid md:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden min-h-[650px] flex-col justify-between bg-[radial-gradient(circle_at_24%_18%,rgba(112,145,195,0.35),transparent_32%),linear-gradient(145deg,#0d1624_0%,#17283e_52%,#0d1522_100%)] p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><GraduationCap className="h-6 w-6" /></div>
            <div><p className="font-display text-lg font-bold">Morfosis</p><p className="text-xs uppercase tracking-[0.2em] text-white/50">Schools LMS</p></div>
          </div>
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">Low-spec ready • Multi-tenant</p>
            <h1 className="font-display text-5xl font-bold leading-tight tracking-tight">Operasional sekolah yang rapi, tahan ujian massal.</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/62">Login surface ini memakai floating input Morfostocks dengan icon, Zod validation, dan tanpa native browser validation bubble.</p>
          </div>
        </div>

        <div className="p-6 sm:p-10 md:p-12">
          <div className="mb-9 md:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"><GraduationCap className="h-6 w-6" /></div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[color:var(--foreground)]">Morfosis LMS</h1>
          </div>
          <div className="hidden md:block">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[color:var(--foreground)]">Masuk ke workspace</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">Gunakan akun demo untuk melihat dashboard dan gallery.</p>
          </div>

          <Alert className="mt-7" tone="info" title="Demo credential" description="guru@morfosis.local / morfosis123" />

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 space-y-5">
            <FloatingInput label="Email Address" prefix={<Mail className="h-4 w-4" />} {...register("email")} error={errors.email?.message} />
            <FloatingInput label="Password" type="password" prefix={<LockKeyhole className="h-4 w-4" />} {...register("password")} error={errors.password?.message} />

            <Button type="submit" className="w-full" size="lg">
              {isSubmitting ? "Memproses..." : "Masuk"}
            </Button>
            <div className="text-center">
              <a href="#" className="text-sm font-semibold text-[color:var(--brand-strong)] hover:underline">Lupa password?</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
