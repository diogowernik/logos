// @vitest-environment node
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { beforeEach, expect, it, vi } from "vitest";

let listeners: Record<string, (event: Record<string, unknown>) => void>;
const cache = { addAll: vi.fn(), put: vi.fn() };
const caches = { open: vi.fn(), match: vi.fn(), keys: vi.fn(), delete: vi.fn() };
const fetch = vi.fn();
const worker = { skipWaiting: vi.fn(), clients: { claim: vi.fn() } };

beforeEach(() => {
  vi.resetAllMocks();
  listeners = {};
  caches.open.mockResolvedValue(cache);
  cache.addAll.mockResolvedValue(undefined);
  caches.keys.mockResolvedValue([]);
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    URL, Response, caches, fetch,
    self: { ...worker, location: { origin: "https://books.test" },
      addEventListener: (name: string, listener: typeof listeners[string]) => { listeners[name] = listener; } },
  });
});

it("never intercepts pages, authentication, private files, mutations or other origins", () => {
  for (const [url, method] of [
    ["/", "GET"], ["/login", "GET"], ["/projects/book", "GET"],
    ["/api/auth/session", "GET"], ["/api/library/assets/id/file", "GET"],
    ["/api/auth/login", "POST"], ["/icons/pwa-192.png", "POST"],
    ["/icons/pwa-192.png?private=true", "GET"], ["https://other.test/icons/pwa-192.png", "GET"],
  ]) {
    const respondWith = vi.fn();
    listeners.fetch({ request: new Request(new URL(url, "https://books.test"), { method }), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  }
  expect(caches.open).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("precaches only the public manifest and icons", async () => {
  let pending: Promise<unknown> | undefined;
  listeners.install({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
  await pending;
  expect(cache.addAll).toHaveBeenCalledWith([
    "/manifest.webmanifest", "/icons/pwa-192.png", "/icons/pwa-512.png",
    "/icons/pwa-maskable-512.png", "/icons/apple-touch-icon.png",
  ]);
  expect(worker.skipWaiting).toHaveBeenCalled();
});

it("still activates when optional asset storage is unavailable", async () => {
  caches.open.mockRejectedValue(new Error("storage unavailable"));
  let pending: Promise<unknown> | undefined;
  listeners.install({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
  await pending;
  expect(worker.skipWaiting).toHaveBeenCalled();
});

it("updates a public icon from the network and falls back to its cache offline", async () => {
  const request = new Request("https://books.test/icons/pwa-192.png");
  const network = new Response("icon");
  fetch.mockResolvedValueOnce(network).mockRejectedValueOnce(new Error("offline"));
  caches.match.mockResolvedValue(new Response("cached-icon"));
  let response: Promise<Response> | undefined;
  const respondWith = (promise: Promise<Response>) => { response = promise; };
  listeners.fetch({ request, respondWith });
  expect(await (await response)!.text()).toBe("icon");
  expect(cache.put).toHaveBeenCalledWith(request, expect.any(Response));
  listeners.fetch({ request, respondWith });
  expect(await (await response)!.text()).toBe("cached-icon");
});

it("keeps a valid network response when cache storage fails", async () => {
  fetch.mockResolvedValue(new Response("icon"));
  caches.open.mockRejectedValue(new Error("quota"));
  let response: Promise<Response> | undefined;
  listeners.fetch({ request: new Request("https://books.test/icons/pwa-192.png"),
    respondWith: (promise: Promise<Response>) => { response = promise; } });
  expect(await (await response)!.text()).toBe("icon");
});

it("removes only older caches belonging to books", async () => {
  caches.keys.mockResolvedValue(["books-pwa-v0", "books-pwa-v1", "another-app"]);
  let pending: Promise<unknown> | undefined;
  listeners.activate({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
  await pending;
  expect(caches.delete).toHaveBeenCalledExactlyOnceWith("books-pwa-v0");
  expect(worker.clients.claim).toHaveBeenCalled();
});
