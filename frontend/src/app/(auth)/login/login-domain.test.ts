import { describe, expect, it } from "vitest";
import { getAuthErrorMessage, getPostLoginRedirect, loginSchema } from "./login-domain";

describe("login domain helpers", () => {
  it("validates email format and minimum password length", () => {
    expect(loginSchema.safeParse({ email: "guru@morfosis.local", password: "morfosis123" }).success).toBe(true);

    const invalid = loginSchema.safeParse({ email: "guru", password: "short" });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.flatten().fieldErrors.email?.[0]).toBe("Format email tidak valid");
      expect(invalid.error.flatten().fieldErrors.password?.[0]).toBe("Password minimal 8 karakter");
    }
  });

  it("maps auth error status to user-facing copy", () => {
    expect(getAuthErrorMessage(401)).toBe("Email atau password salah.");
    expect(getAuthErrorMessage(403)).toBe("Akun tidak memiliki akses ke tenant ini.");
    expect(getAuthErrorMessage(429)).toBe("Terlalu banyak percobaan login. Coba lagi sebentar.");
    expect(getAuthErrorMessage(500)).toBe("Login belum berhasil. Periksa koneksi lalu coba lagi.");
  });

  it("routes users to the correct workspace after login", () => {
    expect(getPostLoginRedirect("student")).toBe("/app/learn");
    expect(getPostLoginRedirect("teacher")).toBe("/app/courses");
    expect(getPostLoginRedirect("admin")).toBe("/app");
    expect(getPostLoginRedirect("superadmin")).toBe("/app/tenants");
  });
});
