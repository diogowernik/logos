import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  fetch: vi.fn(),
  token: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }),
  notFound: vi.fn(() => { throw new Error("not-found"); }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/django", () => ({
  djangoFetch: mocks.fetch,
  getAuthToken: mocks.token,
  BackendError: class extends Error {},
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("@/features/library/ProjectEditor", () => ({ ProjectEditor: () => null }));
vi.mock("@/features/library/Library", () => ({ Library: () => null }));
import ProjectPage from "@/app/(app)/projects/[id]/page";
import NewTextPage from "@/app/(app)/projects/[id]/new/page";
import CollectionPage from "@/app/(app)/collections/[id]/page";
import HomePage from "@/app/(app)/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.token.mockResolvedValue("private-token");
  mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 3, slug: "o-jogador" }) });
});

it("opens a slug URL with a numeric internal project ID", async () => {
  const page = await ProjectPage({ params: Promise.resolve({ id: "o-jogador" }), searchParams: Promise.resolve({}) });
  expect(page.props.projectId).toBe("3");
  expect(mocks.requireUser).toHaveBeenCalledOnce();
  expect(mocks.fetch).toHaveBeenCalledWith("/api/library/projects/o-jogador/", { headers: { Authorization: "Token private-token" } });
});

it("redirects old project URLs preserving the selected group", async () => {
  await expect(NewTextPage({ params: Promise.resolve({ id: "3" }), searchParams: Promise.resolve({ group: "8" }) })).rejects.toThrow("redirect:/projects/o-jogador/new?group=8");
});

it("resolves collections and redirects legacy query links", async () => {
  mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 7, slug: "a-cultura" }) });
  const page = await CollectionPage({ params: Promise.resolve({ id: "a-cultura" }), searchParams: Promise.resolve({}) });
  expect(page.props.collectionId).toBe(7);
  await expect(HomePage({ searchParams: Promise.resolve({ collection: "7", create: "project" }) })).rejects.toThrow("redirect:/collections/a-cultura?create=project");
});

it("shows not found for inaccessible references", async () => {
  mocks.fetch.mockResolvedValue({ status: 404 });
  await expect(ProjectPage({ params: Promise.resolve({ id: "privado" }), searchParams: Promise.resolve({}) })).rejects.toThrow("not-found");
});

it("routes the legacy PWA entry through the authenticated launch flow", async () => {
  await expect(HomePage({ searchParams: Promise.resolve({ source: "pwa" }) })).rejects.toThrow("redirect:/pwa");
});
