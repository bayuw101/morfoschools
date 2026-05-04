import { describe, it, expect } from "vitest";
import { decideAuthGuard } from "./auth-guard";

describe("auth guard decision", () => {
  // ── Static assets always pass ─────────────────────────────
  it("allows /_next/static/* regardless of auth", () => {
    expect(decideAuthGuard("/_next/static/chunk.js", false)).toEqual({ action: "allow" });
    expect(decideAuthGuard("/_next/static/chunk.js", true)).toEqual({ action: "allow" });
  });

  it("allows /favicon.ico regardless of auth", () => {
    expect(decideAuthGuard("/favicon.ico", false)).toEqual({ action: "allow" });
  });

  // ── Public routes ─────────────────────────────────────────
  it("allows / (landing) without auth", () => {
    expect(decideAuthGuard("/", false)).toEqual({ action: "allow" });
  });

  it("allows /login without auth", () => {
    expect(decideAuthGuard("/login", false)).toEqual({ action: "allow" });
  });

  it("allows /api/* without auth (backend proxy)", () => {
    expect(decideAuthGuard("/api/v1/auth/login", false)).toEqual({ action: "allow" });
  });

  // ── Login redirect when authenticated ─────────────────────
  it("redirects /login → /app when authenticated", () => {
    expect(decideAuthGuard("/login", true)).toEqual({ action: "redirect", to: "/app" });
  });

  // ── Protected routes ──────────────────────────────────────
  it("redirects /app to /login when unauthenticated", () => {
    expect(decideAuthGuard("/app", false)).toEqual({ action: "redirect", to: "/login" });
  });

  it("redirects /app/exams/123/monitor to /login when unauthenticated", () => {
    expect(decideAuthGuard("/app/exams/123/monitor", false)).toEqual({ action: "redirect", to: "/login" });
  });

  it("allows /app when authenticated", () => {
    expect(decideAuthGuard("/app", true)).toEqual({ action: "allow" });
  });

  it("allows /app/courses when authenticated", () => {
    expect(decideAuthGuard("/app/courses", true)).toEqual({ action: "allow" });
  });

  it("allows / when authenticated (landing still accessible)", () => {
    expect(decideAuthGuard("/", true)).toEqual({ action: "allow" });
  });
});
