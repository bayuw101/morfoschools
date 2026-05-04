import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type LoginRole = "superadmin" | "admin" | "teacher" | "student";

export function getAuthErrorMessage(status: number): string {
  if (status === 401) return "Email atau password salah.";
  if (status === 403) return "Akun tidak memiliki akses ke tenant ini.";
  if (status === 429) return "Terlalu banyak percobaan login. Coba lagi sebentar.";
  return "Login belum berhasil. Periksa koneksi lalu coba lagi.";
}

export function getPostLoginRedirect(role: LoginRole): string {
  const routes: Record<LoginRole, string> = {
    superadmin: "/app/tenants",
    admin: "/app",
    teacher: "/app/courses",
    student: "/app/learn",
  };

  return routes[role];
}
