const DEFAULT_API_BASE = "http://10.0.2.2:5000";
const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE
).replace(/\/+$/, "");

type RequestOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fields: Record<string, string> = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const raw = await res.text();
  let data: any = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!res.ok) {
    throw new ApiError(
      data.error || data.raw || `Request failed: ${res.status}`,
      res.status,
      data.fields || {}
    );
  }

  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) =>
    apiRequest("/auth/me", { token }),

  listCases: (token: string) =>
    apiRequest("/cases", { token }),

  getCase: (caseId: string, token: string) =>
    apiRequest(`/cases/${caseId}`, { token }),

  listClauses: (caseId: string, token: string) =>
    apiRequest(`/cases/${caseId}/clauses`, { token }),

  getClauseStatus: (caseId: string, token: string) =>
    apiRequest(`/cases/${caseId}/clauses/status`, { token }),

  listMessages: (caseId: string, token: string) =>
    apiRequest(`/cases/${caseId}/messages`, { token }),

  sendMessage: (caseId: string, text: string, token: string) =>
    apiRequest(`/cases/${caseId}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({ text }),
    }),
};
