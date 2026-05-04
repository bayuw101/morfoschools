// ── Auth session management & API client ────────────────────
// Lightweight, no external deps. Works with localStorage (browser)
// or any Storage-like object (tests).
// Token is also mirrored to a cookie so Next.js middleware (Edge)
// can read it for route protection.

const SESSION_KEY = "morfoschools_session";
export const AUTH_TOKEN_COOKIE = "morfoschools_token";
const TOKEN_COOKIE = AUTH_TOKEN_COOKIE;

// ── Types ───────────────────────────────────────────────────
export type AuthSession = {
  token: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
  expiresAt: string; // ISO-8601
};

export type LoginCredentials = {
  email: string;
  password: string;
  tenantId: string;
};

export type BackendLoginResponse = {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

export type LoginResponse = AuthSession;

// ── Storage-backed session helpers ──────────────────────────
export type SessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function defaultStorage(): SessionStorage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
}

export function storeSession(session: AuthSession, storage?: SessionStorage | null): void {
  const s = storage ?? defaultStorage();
  s?.setItem(SESSION_KEY, JSON.stringify(session));
  // Mirror token to cookie for Next.js middleware (Edge runtime)
  if (typeof document !== "undefined") {
    const expires = new Date(session.expiresAt).toUTCString();
    document.cookie = `${TOKEN_COOKIE}=${session.token}; path=/; expires=${expires}; SameSite=Lax`;
  }
}

export function getSession(storage?: SessionStorage | null): AuthSession | null {
  const s = storage ?? defaultStorage();
  const raw = s?.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession(storage?: SessionStorage | null): void {
  const s = storage ?? defaultStorage();
  s?.removeItem(SESSION_KEY);
  // Remove cookie
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }
}

export function isAuthenticated(storage?: SessionStorage | null): boolean {
  const session = getSession(storage);
  if (!session) return false;
  return new Date(session.expiresAt) > new Date();
}

// ── Auth API client ─────────────────────────────────────────
export type AuthApiClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export function createAuthApiClient(options: AuthApiClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(path: string, init: RequestInit & { headers: Record<string, string> }): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, init);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof payload?.error === "string" ? payload.error : `auth_request_failed_${response.status}`;
      throw new Error(message);
    }
    return payload as T;
  }

  return {
    async login(creds: LoginCredentials) {
      const payload = await request<BackendLoginResponse>("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": creds.tenantId,
        },
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      });

      return {
        token: payload.token,
        userId: payload.user.id,
        email: payload.user.email,
        name: payload.user.name,
        role: payload.user.role,
        tenantId: creds.tenantId,
        tenantName: `Tenant ${creds.tenantId}`,
        expiresAt: payload.expiresAt,
      } satisfies LoginResponse;
    },

    me(token: string, tenantId: string) {
      return request<{ userId: string; email: string; name: string; role: string }>("/api/v1/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
      });
    },

    logout(token: string, tenantId: string) {
      return request<{ ok: boolean }>("/api/v1/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
      });
    },
  };
}
