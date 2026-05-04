import { getSession } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, public payload: any) {
    super(payload?.error || "API Error");
  }
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Tenant-scoped backend routes require X-Tenant-ID.
  // The login flow stores tenantId in morfoschools_session.
  if (typeof window !== "undefined") {
    const session = getSession();
    if (session?.tenantId) {
      defaultHeaders["X-Tenant-ID"] = session.tenantId;
    }
  }

  const url = `http://localhost:8080${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
    // Required to send cookies (like morfoschools_token) to localhost:8080
    credentials: "include", 
  });

  if (response.status === 401) {
    // If we're inside a browser environment
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, { error: "unauthorized" });
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}
