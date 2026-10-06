// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => jar }));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as session } from "@/app/api/auth/session/route";
import { AUTH_COOKIE, isSameOrigin } from "@/server/django";

const fetchMock = vi.fn();
const request = (payload: unknown = { username: "example", password: "password" }) =>
  new Request("http://localhost:3000/api/auth/login", {
    method: "POST", headers: { origin: "http://localhost:3000" }, body: JSON.stringify(payload),
  });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  jar.get.mockReset();
  jar.set.mockReset();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DJANGO_API_URL", "http://localhost:8000");
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
});

describe("Next authentication boundary", () => {
  it("keeps token only in an HttpOnly app cookie and disables caching", async () => {
    fetchMock.mockResolvedValue(Response.json({ auth_token: "private-token" }));
    const response = await login(request());
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(jar.set).toHaveBeenCalledWith(AUTH_COOKIE, "private-token", expect.objectContaining({
      httpOnly: true, sameSite: "lax", path: "/", secure: false,
    }));
  });

  it("sets Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    fetchMock.mockResolvedValue(Response.json({ auth_token: "token" }));
    await login(request());
    expect(jar.set).toHaveBeenCalledWith(AUTH_COOKIE, "token", expect.objectContaining({ secure: true }));
  });

  it("rejects cross-origin, spoofed forwarded-host and missing production origin", async () => {
    const hostile = new Request("http://localhost:3000/api/auth/login", { method: "POST", headers: {
      origin: "https://evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https",
    } });
    expect((await login(hostile)).status).toBe(403);
    expect((await logout(hostile)).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "");
    expect(isSameOrigin(request())).toBe(false);
  });

  it("does not set a cookie for invalid input, credentials or malformed upstream data", async () => {
    expect((await login(request({ username: 1 }))).status).toBe(400);
    fetchMock.mockResolvedValue(Response.json({ detail: "invalid" }, { status: 400 }));
    expect((await login(request())).status).toBe(401);
    fetchMock.mockResolvedValue(Response.json({ auth_token: null }));
    expect((await login(request())).status).toBe(502);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("recovers the authenticated user without exposing additional backend fields", async () => {
    jar.get.mockReturnValue({ value: "token" });
    fetchMock.mockResolvedValue(Response.json({ id: 1, username: "example", email: "private@example.com" }));
    const response = await session();
    expect(await response.json()).toEqual({ authenticated: true, user: { id: 1, username: "example" } });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/auth/users/me/", expect.objectContaining({
      headers: { Authorization: "Token token" }, cache: "no-store",
    }));
  });

  it("clears invalid sessions but preserves cookies during a backend outage", async () => {
    jar.get.mockReturnValue({ value: "token" });
    fetchMock.mockResolvedValue(Response.json({}, { status: 401 }));
    expect(await (await session()).json()).toEqual({ authenticated: false, user: null });
    expect(jar.set).toHaveBeenCalledWith(AUTH_COOKIE, "", expect.objectContaining({ maxAge: 0 }));
    jar.set.mockClear();
    fetchMock.mockRejectedValue(new Error("offline"));
    expect((await session()).status).toBe(502);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("revokes the backend token on logout and always terminates local session", async () => {
    jar.get.mockReturnValue({ value: "token" });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect((await logout(request())).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/auth/token/logout/", expect.objectContaining({ method: "POST" }));
    fetchMock.mockRejectedValue(new Error("offline"));
    expect((await logout(request())).status).toBe(200);
    expect(jar.set).toHaveBeenCalledWith(AUTH_COOKIE, "", expect.objectContaining({ maxAge: 0 }));
  });
});
