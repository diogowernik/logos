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
  await expect(apiRequest("/api/example")).rejects.toMatchObject(new ApiError("Session expired", 401));
});

it("explains DRF field validation with labels supplied by the product", async () => {
  fetchMock.mockResolvedValue(Response.json({ title: ["Este campo é obrigatório."], subtitle: ["Máximo de 500 caracteres."] }, { status: 400 }));
  await expect(apiRequest("/api/example", undefined, { title: "Título", subtitle: "Subtítulo" }))
    .rejects.toMatchObject(new ApiError("Título: Este campo é obrigatório. Subtítulo: Máximo de 500 caracteres.", 400, {
      title: ["Este campo é obrigatório."], subtitle: ["Máximo de 500 caracteres."],
    }));
});

it("preserves general validation errors without a technical field label", async () => {
  fetchMock.mockResolvedValue(Response.json({ non_field_errors: ["Os valores são incompatíveis."] }, { status: 400 }));
  await expect(apiRequest("/api/example")).rejects.toMatchObject(new ApiError("Os valores são incompatíveis.", 400));
});

it("handles nested validation errors and retains the original field paths", async () => {
  fetchMock.mockResolvedValue(Response.json({ profile: { name: ["Informe o nome."] } }, { status: 400 }));
  await expect(apiRequest("/api/example", undefined, { "profile.name": "Nome" }))
    .rejects.toMatchObject(new ApiError("Nome: Informe o nome.", 400, { "profile.name": ["Informe o nome."] }));
});

it("uses a readable fallback for non-JSON or empty error responses, including downloads", async () => {
  fetchMock.mockResolvedValue(new Response("<html>upstream error</html>", { status: 502 }));
  await expect(downloadRequest("/api/example")).rejects.toMatchObject(new ApiError("Não foi possível concluir a solicitação.", 502));
  fetchMock.mockResolvedValue(Response.json({}, { status: 500 }));
  await expect(apiRequest("/api/example")).rejects.toMatchObject(new ApiError("Não foi possível concluir a solicitação.", 500));
});
