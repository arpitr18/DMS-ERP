const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function downloadImportTemplate(type) {
  const response = await fetch(`${BASE}/${type}/template`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!response.ok) throw new Error('Could not download template. Please check your session and try again.');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `${type}-import-template.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getToken() {
  return localStorage.getItem("dm_token");
}
export function setSession(token, user) {
  localStorage.setItem("dm_token", token);
  localStorage.setItem("dm_user", JSON.stringify(user));
  window.dispatchEvent(new Event("dm_session_changed"));
}
export function clearSession() {
  localStorage.removeItem("dm_token");
  localStorage.removeItem("dm_user");
  window.dispatchEvent(new Event("dm_session_changed"));
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("dm_user") || "null");
  } catch {
    return null;
  }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${BASE}${path}`, { ...options, headers });
  if (response.status === 401) {
    clearSession();
    if (!location.pathname.includes("/login")) location.href = "/login";
  }
  if (!response.ok) {
    let body = {};
    try {
      body = await response.json();
    } catch {}
    const error = new Error(
      body.message || `Request failed (${response.status})`,
    );
    error.data = body;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function openInvoicePdf(id) {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${BASE}/invoices/${id}/pdf`, { headers });
  if (!response.ok) throw new Error("Could not generate invoice PDF.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
