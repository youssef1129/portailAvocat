// Simple auth token persistence for lawyer JWT (localStorage)
const AUTH_TOKEN_KEY = "pa:authToken";

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  setAuthToken(null);
}

export function authHeader(): Record<string, string> | undefined {
  const t = getAuthToken();
  if (!t) return undefined;
  return { Authorization: `Bearer ${t}` };
}

export default {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  authHeader,
};
