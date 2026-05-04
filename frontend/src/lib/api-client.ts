export class ApiError extends Error {
  constructor(public status: number, public payload: any) {
    super(payload?.error || "API Error");
  }
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `http://localhost:8080${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
