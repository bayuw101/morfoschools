// ── Auth guard decision logic ───────────────────────────────
// Pure function, testable without Edge runtime.
// Used by Next.js middleware and tests.

export type AuthGuardDecision =
  | { action: "allow" }
  | { action: "redirect"; to: string };

const PUBLIC_EXACT = ["/", "/login"];
const PUBLIC_PREFIXES = ["/api/"];
const STATIC_PREFIXES = ["/_next/", "/favicon.ico"];

export function decideAuthGuard(pathname: string, hasToken: boolean): AuthGuardDecision {
  // Static assets — always allow
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return { action: "allow" };
  }

  // Public paths — allow, but redirect /login to /app if already authenticated
  const isPublic =
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublic) {
    if (pathname === "/login" && hasToken) {
      return { action: "redirect", to: "/app" };
    }
    return { action: "allow" };
  }

  // Protected paths — require token
  if (!hasToken) {
    return { action: "redirect", to: "/login" };
  }

  return { action: "allow" };
}
