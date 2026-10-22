import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/device-lock/[action]/route";
import { deviceLockCookie } from "@/features/device-lock/preferences";
const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), fetchCurrentUser: vi.fn(), djangoFetch: vi.fn(), isSameOrigin: vi.fn(), getAuthToken: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get, set: mocks.set }) }));
vi.mock("@/server/django", () => ({ ...mocks, noStoreJson: (data: unknown, init?: ResponseInit) => Response.json(data, init),  }));
function call(action: string, body: object = {}) {
  return POST(new Request(`http://localhost:3026/api/auth/device-lock/${action}`, {
    method: "POST", headers: { origin: "http://localhost:3026", "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ action }) });
}
beforeEach(() => {
  mocks.getAuthToken.mockResolvedValue("session-token");
  mocks.isSameOrigin.mockReturnValue(true);
  mocks.fetchCurrentUser.mockResolvedValue({ id: 7 });
  mocks.get.mockReturnValue({ value: "device-credential" });
  mocks.djangoFetch.mockResolvedValue(Response.json({ enabled: true, credential_id: "verified-id" }));
});
it("rejects cross origin or unauthenticated actions", async () => {
  mocks.isSameOrigin.mockReturnValue(false);
  expect((await call("register-options")).status).toBe(403);
  expect(mocks.djangoFetch).not.toHaveBeenCalled();
  mocks.getAuthToken.mockResolvedValue("session-token");
  mocks.isSameOrigin.mockReturnValue(true);
  mocks.fetchCurrentUser.mockResolvedValue(null);
  expect((await call("unlock-options")).status).toBe(401);
});
it("binds options to the cookie and browser origin", async () => {
  await call("unlock-options", { origin: "https://attacker.test", credential_id: "attacker" });
  expect(JSON.parse(mocks.djangoFetch.mock.calls[0][1].body)).toMatchObject({ origin: "http://localhost:3026", credential_id: "device-credential" });
  expect(mocks.get).toHaveBeenCalledWith(deviceLockCookie(7));
});
it("sets HttpOnly preference only after verified registration", async () => {
  const response = await call("register-verify", { challenge_id: "challenge", response: {} });
  expect(mocks.set).toHaveBeenCalledWith(deviceLockCookie(7), "verified-id", expect.objectContaining({ httpOnly: true, sameSite: "lax" }));
  expect(await response.json()).toEqual({ enabled: true });
});
it("does not activate on failure and clears the cookie on confirmed disable", async () => {
  mocks.djangoFetch.mockResolvedValueOnce(Response.json({ detail: "Invalid" }, { status: 400 }));
  expect((await call("register-verify")).status).toBe(400);
  expect(mocks.set).not.toHaveBeenCalled();
  mocks.djangoFetch.mockResolvedValueOnce(Response.json({ enabled: false }));
  await call("password-unlock", { password: "password", disable: true });
  expect(mocks.set).toHaveBeenCalledWith(deviceLockCookie(7), "", expect.objectContaining({ maxAge: 0 }));
});
