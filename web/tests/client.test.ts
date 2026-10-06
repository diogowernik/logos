import { beforeEach, expect, it, vi } from "vitest";
import { apiRequest, ApiError, downloadRequest } from "@/api/client";

const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });

it("sends JSON and preserves caller headers", async () => {
  fetchMock.mockResolvedValue(Response.json({ ok: true }));
  await apiRequest("/api/example", { method: "POST", body: "{}", headers: new Headers({ "X-Test": "1" }) });
  const headers = fetchMock.mock.calls[0][1].headers as Headers;
  expect(headers.get("content-type")).toBe("application/json");
  expect(headers.get("x-test")).toBe("1");
});

it("lets the browser supply the multipart boundary for FormData", async () => {
  fetchMock.mockResolvedValue(Response.json({ ok: true }));
  const data = new FormData();
  data.set("file", new File(["example"], "example.txt"));
  await apiRequest("/api/example", { method: "POST", body: data });
  expect(fetchMock.mock.calls[0][1].headers.has("content-type")).toBe(false);
});

it("handles empty success, download and structured errors", async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  expect(await apiRequest("/api/example", { method: "DELETE" })).toBeUndefined();
  fetchMock.mockResolvedValue(new Response("contents"));
  expect(await (await downloadRequest("/api/example")).text()).toBe("contents");
  fetchMock.mockResolvedValue(Response.json({ detail: "Session expired" }, { status: 401 }));
  await expect(apiRequest("/api/example")).rejects.toEqual(new ApiError("Session expired", 401));
});
