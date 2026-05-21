import { getUser, clearToken } from "./api";

export function isAuthenticated() {
  return !!getUser();
}

export function logout() {
  clearToken();
  window.location.href = "/login";
}
