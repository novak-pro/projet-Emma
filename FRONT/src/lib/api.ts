import type {
  Admin,
  AuthResponse,
  Clusters,
  Paginated,
  Report,
  ReportStatus,
  SeverityClass,
  Summary,
  Trends,
} from "./types";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TOKEN_KEY = "projetemma_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function mediaUrl(url: string) {
  if (!url) return url;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Impossible de joindre le serveur. Vérifiez votre connexion.", 0);
  }

  if (response.status === 401 && options.auth) {
    setToken(null);
    window.dispatchEvent(new Event("projetemma:unauthorized"));
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message: unknown }).message)
        : "Une erreur est survenue";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthResponse>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      { auth: false },
    );
  },

  me() {
    return request<Admin>("/api/auth/me", {}, { auth: true });
  },

  listReports(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    severityClass?: string;
    damageType?: string;
    region?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<Paginated<Report>>(`/api/admin/reports?${query.toString()}`, {}, { auth: true });
  },

  getReport(id: string) {
    return request<Report>(`/api/admin/reports/${id}`, {}, { auth: true });
  },

  updateReport(
    id: string,
    data: { status?: ReportStatus; severityClass?: SeverityClass | null; severityScore?: number | null },
  ) {
    return request<Report>(
      `/api/admin/reports/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
      { auth: true },
    );
  },

  deleteReport(id: string) {
    return request<{ message: string }>(
      `/api/admin/reports/${id}`,
      { method: "DELETE" },
      { auth: true },
    );
  },

  async exportCsv() {
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_URL}/api/admin/export.csv`, { headers });
    if (!response.ok) {
      throw new ApiError("Export impossible", response.status);
    }
    return response.blob();
  },

  analytics<T>(name: string, params: Record<string, string | number> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => query.set(key, String(value)));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<T>(`/api/analytics/${name}${suffix}`, {}, { auth: true });
  },

  summary() {
    return api.analytics<Summary>("summary");
  },

  trends() {
    return api.analytics<Trends>("trends");
  },

  clusters(params: { eps_km?: number; min_samples?: number } = {}) {
    return api.analytics<Clusters>("clusters", params);
  },

  recompute() {
    return request<{ message: string; updated: number }>(
      "/api/analytics/recompute",
      { method: "POST" },
      { auth: true },
    );
  },

  getFormConfigPublic() {
    return request<any>("/api/form-config", {}, { auth: false });
  },

  getFormConfigAdmin() {
    return request<any>("/api/admin/form-config", {}, { auth: true });
  },

  updateFormConfig(config: any) {
    return request<any>("/api/admin/form-config", { method: "PUT", body: JSON.stringify(config) }, { auth: true });
  },

  resetFormConfig() {
    return request<any>("/api/admin/form-config/reset", { method: "POST" }, { auth: true });
  },

  reverseGeocode(lat: number, lng: number) {
    const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    return request<{ displayName: string; region: string; city: string; road: string }>(
      `/api/geocode/reverse?${query.toString()}`,
      {},
      { auth: false },
    );
  },

  searchPlaces(q: string) {
    const query = new URLSearchParams({ q });
    return request<Array<{ displayName: string; latitude: number; longitude: number }>>(
      `/api/geocode/search?${query.toString()}`,
      {},
      { auth: false },
    );
  },

  submitReport(formData: FormData) {
    return request<{ message: string; report: Report }>(
      "/api/reports",
      { method: "POST", body: formData },
      { auth: false },
    );
  },
};
