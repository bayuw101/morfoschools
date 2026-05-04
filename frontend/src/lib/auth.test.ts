import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  type AuthSession,
  type LoginCredentials,
  type LoginResponse,
  storeSession,
  getSession,
  clearSession,
  isAuthenticated,
  createAuthApiClient,
} from "./auth";

// ─── Storage stub ───────────────────────────────────────────
const storageStub = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

beforeEach(() => storageStub.clear());

// ── Session store tests ─────────────────────────────────────
describe("session store", () => {
  it("returns null when no session stored", () => {
    expect(getSession(storageStub)).toBeNull();
  });

  it("stores and retrieves a session", () => {
    const session: AuthSession = {
      token: "tok_abc",
      userId: "u1",
      email: "a@b.com",
      name: "Test",
      role: "student",
      tenantId: "t1",
      tenantName: "Demo",
      expiresAt: "2099-01-01T00:00:00Z",
    };
    storeSession(session, storageStub);
    expect(getSession(storageStub)).toEqual(session);
  });

  it("clearSession removes the session", () => {
    const session: AuthSession = {
      token: "tok_abc",
      userId: "u1",
      email: "a@b.com",
      name: "Test",
      role: "student",
      tenantId: "t1",
      tenantName: "Demo",
      expiresAt: "2099-01-01T00:00:00Z",
    };
    storeSession(session, storageStub);
    clearSession(storageStub);
    expect(getSession(storageStub)).toBeNull();
  });

  it("isAuthenticated returns true for valid unexpired session", () => {
    storeSession({
      token: "tok", userId: "u", email: "e", name: "n",
      role: "teacher", tenantId: "t", tenantName: "T",
      expiresAt: "2099-12-31T23:59:59Z",
    }, storageStub);
    expect(isAuthenticated(storageStub)).toBe(true);
  });

  it("isAuthenticated returns false for expired session", () => {
    storeSession({
      token: "tok", userId: "u", email: "e", name: "n",
      role: "admin", tenantId: "t", tenantName: "T",
      expiresAt: "2000-01-01T00:00:00Z",
    }, storageStub);
    expect(isAuthenticated(storageStub)).toBe(false);
  });
});

// ── Auth API client tests ───────────────────────────────────
describe("createAuthApiClient", () => {
  const BASE = "http://localhost:8080";

  it("login sends POST with email/password/tenantId and returns session on 200", async () => {
    const mockResponse: LoginResponse = {
      token: "tok_xyz",
      userId: "u1",
      email: "alya@demo",
      name: "Alya",
      role: "student",
      tenantId: "t1",
      tenantName: "SMA Demo",
      expiresAt: "2099-01-01T00:00:00Z",
    };

    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const client = createAuthApiClient({ baseUrl: BASE, fetcher: fakeFetch as unknown as typeof fetch });
    const creds: LoginCredentials = { email: "alya@demo", password: "pw", tenantId: "t1" };
    const result = await client.login(creds);

    expect(fakeFetch).toHaveBeenCalledOnce();
    const [url, init] = fakeFetch.mock.calls[0];
    expect(url).toBe(`${BASE}/api/v1/auth/login`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ email: "alya@demo", password: "pw" });
    expect(init.headers["X-Tenant-ID"]).toBe("t1");
    expect(result).toEqual(mockResponse);
  });

  it("login throws on 401 with server error message", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "invalid_credentials" }),
    });

    const client = createAuthApiClient({ baseUrl: BASE, fetcher: fakeFetch as unknown as typeof fetch });
    await expect(client.login({ email: "x", password: "y", tenantId: "t" }))
      .rejects.toThrow("invalid_credentials");
  });

  it("me sends GET with Authorization header", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userId: "u1", email: "a@b", name: "A", role: "admin" }),
    });

    const client = createAuthApiClient({ baseUrl: BASE, fetcher: fakeFetch as unknown as typeof fetch });
    await client.me("tok_abc", "t1");

    const [url, init] = fakeFetch.mock.calls[0];
    expect(url).toBe(`${BASE}/api/v1/auth/me`);
    expect(init.headers["Authorization"]).toBe("Bearer tok_abc");
    expect(init.headers["X-Tenant-ID"]).toBe("t1");
  });

  it("logout sends POST with Authorization header", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const client = createAuthApiClient({ baseUrl: BASE, fetcher: fakeFetch as unknown as typeof fetch });
    await client.logout("tok_abc", "t1");

    const [url, init] = fakeFetch.mock.calls[0];
    expect(url).toBe(`${BASE}/api/v1/auth/logout`);
    expect(init.method).toBe("POST");
    expect(init.headers["Authorization"]).toBe("Bearer tok_abc");
  });
});
