export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const TOKEN_KEY = "cv_shortlister_token";

export interface ApiError {
  status: number;
  detail: string;
  body?: unknown;
}

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
};

function parseErrorDetail(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.error === "string") {
      if (typeof record.message === "string") {
        return `${record.error}: ${record.message}`;
      }
      return record.error;
    }
    if (Array.isArray(record.detail)) {
      return record.detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && typeof (item as Record<string, unknown>).msg === "string") {
            return (item as Record<string, unknown>).msg as string;
          }
          return "Invalid request";
        })
        .join(", ");
    }
  }

  return "Request failed";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function clearTokenAndNotify() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("auth:unauthorized"));
}

async function parseResponseError(response: Response): Promise<ApiError> {
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  const detail = parseErrorDetail(body);
  return {
    status: response.status,
    detail,
    body,
  };
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", data, headers, auth = true } = options;

  const requestHeaders = new Headers(headers || {});
  const token = getToken();

  if (auth) {
    if (!token) {
      const error: ApiError = { status: 401, detail: "Missing auth token" };
      clearTokenAndNotify();
      throw error;
    }
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (data !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await parseResponseError(response);
    if (response.status === 401) {
      clearTokenAndNotify();
    }
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

type ApiUploadOptions = {
  method?: "POST" | "PUT" | "PATCH";
  auth?: boolean;
  headers?: HeadersInit;
};

export async function apiUpload<T>(path: string, formData: FormData, options: ApiUploadOptions = {}): Promise<T> {
  const { method = "POST", auth = true, headers } = options;
  const requestHeaders = new Headers(headers || {});

  const token = getToken();
  if (auth) {
    if (!token) {
      const error: ApiError = { status: 401, detail: "Missing auth token" };
      clearTokenAndNotify();
      throw error;
    }
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: formData,
  });

  if (!response.ok) {
    const error = await parseResponseError(response);
    if (response.status === 401) {
      clearTokenAndNotify();
    }
    throw error;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

export async function apiDownload(path: string, filename: string, auth = true): Promise<void> {
  const headers = new Headers();
  const token = getToken();

  if (auth) {
    if (!token) {
      const error: ApiError = { status: 401, detail: "Missing auth token" };
      clearTokenAndNotify();
      throw error;
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error = await parseResponseError(response);
    if (response.status === 401) {
      clearTokenAndNotify();
    }
    throw error;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
