const API_BASE = "http://10.0.2.2:5000";
type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function apiRequest(path: string, options: RequestOptions = {}) {
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
    console.log("API ERROR PATH:", path);
    console.log("API ERROR STATUS:", res.status);
    console.log("API ERROR BODY:", data);
    throw new Error(data.error || data.raw || `Request failed: ${res.status}`);
  }

  return data;
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
    apiRequest(`/cases/${caseId}/status`, { token }),

  listMessages: (caseId: string, token: string) =>
    apiRequest(`/cases/${caseId}/messages`, { token }),

  sendMessage: (caseId: string, text: string, token: string) =>
    apiRequest(`/cases/${caseId}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({ text }),
    }),
};