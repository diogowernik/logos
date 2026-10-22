import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { render } from "./render";

const register = vi.fn();
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", { userAgent: "Chrome", platform: "", maxTouchPoints: 0,
    serviceWorker: { register } });
  window.matchMedia = vi.fn((query: string) => ({ matches: false, media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);
  register.mockReset().mockResolvedValue({});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function offerInstall(prompt = vi.fn().mockResolvedValue(undefined)) {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) });
  act(() => { window.dispatchEvent(event); });
  return { event, prompt };
}

it("uses the browser prompt only after a click and consumes it after dismissal", async () => {
  render(<InstallAppButton />);
  await act(async () => {});
  expect(screen.queryByRole("button", { name: "Instalar books" })).not.toBeInTheDocument();
  const { event, prompt } = offerInstall();
  expect(event.defaultPrevented).toBe(true);
  expect(prompt).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Instalar books" }));
  expect(prompt).toHaveBeenCalledOnce();
  await waitFor(() => expect(screen.queryByRole("button", { name: "Instalar books" })).not.toBeInTheDocument());
  expect(register).not.toHaveBeenCalled();
});

it("shows manual installation instructions on iPad and hides installation once installed", async () => {
  vi.stubGlobal("navigator", { userAgent: "Safari", platform: "MacIntel", maxTouchPoints: 5 });
  render(<InstallAppButton />);
  await userEvent.click(await screen.findByRole("button", { name: "Instalar books" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Adicionar à Tela de Início");
  await userEvent.click(screen.getByRole("button", { name: "Entendi" }));
  act(() => { window.dispatchEvent(new Event("appinstalled")); });
  expect(screen.queryByRole("button", { name: "Instalar books" })).not.toBeInTheDocument();
});

it("handles a rejected native prompt without an unhandled rejection", async () => {
  render(<InstallAppButton />);
  await act(async () => {});
  offerInstall(vi.fn().mockRejectedValue(new Error("unavailable")));
  await userEvent.click(screen.getByRole("button", { name: "Instalar books" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent("menu do navegador");
});

it("registers the worker in secure production and hides install in standalone mode", async () => {
  vi.stubEnv("NODE_ENV", "production");
  window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(),
    removeEventListener: vi.fn() }) as unknown as MediaQueryList);
  render(<InstallAppButton />);
  await act(async () => {});
  expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
  offerInstall();
  expect(screen.queryByRole("button", { name: "Instalar books" })).not.toBeInTheDocument();
});
