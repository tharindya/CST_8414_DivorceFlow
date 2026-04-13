const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

export const api = {
  // invite
  getInvite: (caseId, token) =>
    request(
      `/cases/invite?caseId=${encodeURIComponent(caseId)}&token=${encodeURIComponent(token)}`
    ),

  sendInvite: (caseId) =>
    request(`/cases/${caseId}/send-invite`, { method: "POST" }),

  // auth
  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  me: () => request("/auth/me"),

  // cases
  listCases: () => request("/cases"),

  createCase: (payload) =>
    request("/cases", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  joinCase: (caseId, payload) =>
    request(`/cases/${caseId}/join`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCase: (caseId) => request(`/cases/${caseId}`),

  // templates
  listTemplates: (jurisdiction) =>
    request(
      `/templates?jurisdiction=${encodeURIComponent(jurisdiction || "General")}`
    ),

  buildTemplateDraft: (templateId, values) =>
    request(`/templates/${templateId}/build`, {
      method: "POST",
      body: JSON.stringify({ values }),
    }),

  // clauses
  listClauses: (caseId) => request(`/cases/${caseId}/clauses`),

  createClause: (caseId, payload) =>
    request(`/cases/${caseId}/clauses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateClause: (clauseId, payload) =>
    request(`/clauses/${clauseId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // workflow
  getClauseStatus: (caseId) => request(`/cases/${caseId}/clauses/status`),

  listComments: (clauseId) => request(`/clauses/${clauseId}/comments`),

  addComment: (clauseId, payload) =>
    request(`/clauses/${clauseId}/comments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  approve: (clauseId) =>
    request(`/clauses/${clauseId}/approve`, {
      method: "POST",
    }),

  reject: (clauseId, payload) =>
    request(`/clauses/${clauseId}/reject`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // export
  getExportCheck: (caseId) => request(`/cases/${caseId}/export/check`),

  //Mock Review
  getMockReview: (caseId) => request(`/cases/${caseId}/mock-review`),

  downloadCasePdf: async (caseId) => {
    const token = getToken();

    const res = await fetch(`${API_BASE}/cases/${caseId}/export/pdf`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      let message = `Request failed: ${res.status}`;
      try {
        const data = await res.json();
        message = data?.error || message;
      } catch {
        // ignore JSON parse failure for non-JSON error body
      }
      throw new Error(message);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "divorce-agreement.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};