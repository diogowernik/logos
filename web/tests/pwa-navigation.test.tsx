import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PwaLaunch } from "@/components/pwa/PwaLaunch";
import { lastPageKey, resumablePage, resumeEndpoint } from "@/components/pwa/navigation";
import { render } from "./render";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  replace.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
});

it("remembers known routes only, excluding parameters, drafts and external URLs", () => {
  for (const path of ["/", "/projects/o-livro", "/projects/o-livro/read", "/collections/ficcao", "/texts/42"]) {
    expect(resumablePage(path)).toBe(path);
  }
  for (const path of [null, "/texts/new", "/projects/o-livro/new", "/login", "/pwa", "/api/auth/login",
    "/projects/book?group=1", "/texts/42#private", "https://outside.test", "//outside.test", "/texts/0"]) {
    expect(resumablePage(path)).toBeNull();
  }
  expect(lastPageKey(1)).not.toBe(lastPageKey(2));
  expect(resumeEndpoint("/projects/book/read")).toBe("/api/library/projects/book/");
});

it("checks access to the saved resource before resuming it", async () => {
  localStorage.setItem(lastPageKey(7), "/projects/o-livro/read");
  render(<PwaLaunch userId={7} />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects/o-livro/read"));
  expect(fetchMock).toHaveBeenCalledWith("/api/library/projects/o-livro/", expect.objectContaining({ cache: "no-store" }));
});

it("uses the library when the resource was deleted or is inaccessible", async () => {
  localStorage.setItem(lastPageKey(7), "/texts/42");
  fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
  render(<PwaLaunch userId={7} />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
});

it("does not resume another account's page", async () => {
  localStorage.setItem(lastPageKey(7), "/texts/42");
  render(<PwaLaunch userId={8} />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  expect(fetchMock).not.toHaveBeenCalled();
});

it("keeps the PWA destination when the session expires", async () => {
  localStorage.setItem(lastPageKey(7), "/texts/42");
  fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
  render(<PwaLaunch userId={7} />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?next=/pwa"));
});

it("shows a recoverable error without discarding the saved page during an outage", async () => {
  localStorage.setItem(lastPageKey(7), "/texts/42");
  fetchMock.mockRejectedValue(new Error("offline"));
  render(<PwaLaunch userId={7} />);
  await screen.findByRole("alert");
  expect(localStorage.getItem(lastPageKey(7))).toBe("/texts/42");
  expect(replace).not.toHaveBeenCalled();
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  await act(async () => { screen.getByRole("button", { name: "Tentar novamente" }).click(); });
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/texts/42"));
});
