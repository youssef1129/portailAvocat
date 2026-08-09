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

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(raw)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenValid(token?: string | null): boolean {
  const rawToken = token ?? getAuthToken();
  if (!rawToken) return false;
  const payload = parseJwtPayload(rawToken);
  if (!payload) return false;
  const expValue = payload.exp;
  if (typeof expValue === "number") {
    return Math.floor(Date.now() / 1000) < expValue;
  }
  if (typeof expValue === "string") {
    const parsed = Number(expValue);
    return Number.isFinite(parsed) ? Math.floor(Date.now() / 1000) < parsed : false;
  }
  return false;
}

export function clearAuthToken() {
  setAuthToken(null);
}

export function authHeader(): Record<string, string> | undefined {
  const t = getAuthToken();
  if (!t) return undefined;
  return { Authorization: `Bearer ${t}` };
}

export function getTokenPayload(): Record<string, unknown> | null {
  const t = getAuthToken();
  if (!t) return null;
  return parseJwtPayload(t);
}

export default {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  authHeader,
  isTokenValid,
  getTokenPayload,
};
