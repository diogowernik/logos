// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ djangoFetch: vi.fn(), getAuthToken: vi.fn(), isSameOrigin: vi.fn() }));
vi.mock("@/server/django", () => ({ ...mocks, noStoreJson: (body: unknown, init: ResponseInit) => Response.json(body, init) }));
import { GET, POST } from "@/app/api/library/[...path]/route";

beforeEach(() => {
  mocks.djangoFetch.mockReset();
  mocks.getAuthToken.mockResolvedValue("private-token");
  mocks.isSameOrigin.mockReturnValue(true);
});

it("preserves multipart boundaries and image bytes when forwarding uploads", async () => {
  const bytes = new Uint8Array([0, 255, 137, 1, 13, 10]);
  const form = new FormData();
  form.append("image", new File([bytes], "capa.png", { type: "image/png" }));
  const request = new NextRequest("http://localhost:3000/api/library/projects/1/cover", { method: "POST", body: form });
  const original = await request.clone().arrayBuffer();
  mocks.djangoFetch.mockResolvedValue(Response.json({ cover: "image" }));
  const response = await POST(request, { params: Promise.resolve({ path: ["projects", "1", "cover"] }) });
  const [, options] = mocks.djangoFetch.mock.calls[0];
  expect(options.headers["Content-Type"]).toBe(request.headers.get("content-type"));
  expect(new Uint8Array(options.body)).toEqual(new Uint8Array(original));
  expect(await response.json()).toEqual({ cover: "image" });
});

it("streams private images without converting bytes to text", async () => {
  const bytes = new Uint8Array([0, 255, 137, 1, 13, 10]);
  mocks.djangoFetch.mockResolvedValue(new Response(bytes, { headers: { "Content-Type": "image/png" } }));
  const response = await GET(new NextRequest("http://localhost:3000/api/library/assets/id/file"), { params: Promise.resolve({ path: ["assets", "id", "file"] }) });
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  expect(response.headers.get("content-type")).toBe("image/png");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("preserves import provenance queries and structured errors through the authenticated proxy", async () => {
  const diagnostic = { detail: "Atualize a prévia", diagnostic: { copy_text: "Relatório de conflito" } };
  mocks.djangoFetch.mockResolvedValue(Response.json(diagnostic, { status: 409 }));
  const response = await GET(new NextRequest("http://localhost:3000/api/library/epub-imports/job/preview?project=1&source=original"),
    { params: Promise.resolve({ path: ["epub-imports", "job", "preview"] }) });
  expect(mocks.djangoFetch.mock.calls[0][0]).toBe("/api/library/epub-imports/job/preview/?project=1&source=original");
  expect(mocks.djangoFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual(diagnostic);
});
