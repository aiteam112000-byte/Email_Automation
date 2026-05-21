const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function getToken() {
  return localStorage.getItem("reachx_token");
}

export function setToken(token) {
  localStorage.setItem("reachx_token", token);
}

export function clearToken() {
  localStorage.removeItem("reachx_token");
  localStorage.removeItem("reachx_user");
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("reachx_user") ?? "null");
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem("reachx_user", JSON.stringify(user));
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return res;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path, body) => request(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
  raw: (path, options) => request(path, options),
};
