import "server-only";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "logos_auth";
const ONE_WEEK = 60 * 60 * 24 * 7;

export class BackendError extends Error {
  constructor() { super("Não foi possível conectar à API."); }
}

export type CurrentUser = { id: number; username: string };

export function getDjangoBase(): string {
  const configured = process.env.DJANGO_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "http://127.0.0.1:8000";
  throw new BackendError();
}

export async function getAuthToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIE)?.value ?? null;
}

export async function setAuthToken(value: string, maxAge = ONE_WEEK): Promise<void> {
  (await cookies()).set(AUTH_COOKIE, value, {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAuthToken(): Promise<void> {
  await setAuthToken("", 0);
}

export async function djangoFetch(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${getDjangoBase()}${path}`, {
      ...init,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(5_000),
    });
  } catch {
    throw new BackendError();
  }
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAuthToken();
  if (!token) return null;
  const response = await djangoFetch("/auth/users/me/", {
    headers: { Authorization: `Token ${token}` },
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new BackendError();
  const user = await response.json().catch(() => null);
  if (typeof user?.id !== "number" || typeof user?.username !== "string") {
    throw new BackendError();
  }
  return { id: user.id, username: user.username };
}

export function isSameOrigin(request: Request): boolean {
  const supplied = request.headers.get("origin") ?? request.headers.get("referer");
  if (!supplied) return false;
  const expected = process.env.APP_ORIGIN ??
    (process.env.NODE_ENV !== "production" ? new URL(request.url).origin : null);
  if (!expected) return false;
  try {
    return new URL(supplied).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export function noStoreJson(payload: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Vary", "Cookie");
  return Response.json(payload, { ...init, headers });
}
