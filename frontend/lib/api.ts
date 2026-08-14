export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = RequestInit & { raw?: boolean };

/** Django/DRF neste projeto usa rotas SEM barra final. */
function normalizePath(path: string): string {
  if (path.includes("?")) {
    const [p, q] = path.split("?");
    return `${p.replace(/\/+$/, "")}?${q}`;
  }
  return path.replace(/\/+$/, "") || "/";
}

async function request<T>(
  path: string,
  options: Options = {},
  retried = false
): Promise<T> {
  const { raw, headers, ...rest } = options;
  const isForm = rest.body instanceof FormData;
  const normalized = normalizePath(path);
  const res = await fetch(`/api${normalized}`, {
    credentials: "include",
    headers: isForm
      ? headers
      : { "Content-Type": "application/json", ...(headers || {}) },
    ...rest,
  });

  // Renova access token em 401 (exceto login/logout/refresh). Uma tentativa só.
  const skipRefresh =
    normalized === "/auth/login" ||
    normalized === "/auth/logout" ||
    normalized === "/auth/refresh";
  if (res.status === 401 && !skipRefresh && !retried) {
    const refreshed = await fetch(`/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) {
      return request<T>(path, options, true);
    }
  }

  if (!res.ok) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* noop */
    }
    const message =
      (data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : null) || `Erro ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  if (raw) return res as unknown as T;
  if (res.status === 204) return null as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function resultsOf<T>(data: T[] | { results: T[] } | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results || [];
}
