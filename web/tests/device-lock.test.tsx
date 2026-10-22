import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { createPortal } from "react-dom";
import { DeviceLockProvider, DeviceLockAction } from "@/features/device-lock/DeviceLockProvider";
import { confirmDevice, deviceRequest } from "@/features/device-lock/client";

vi.mock("@/features/device-lock/client", () => ({ confirmDevice: vi.fn(), deviceRequest: vi.fn(), deviceError: (e: Error) => e.message }));
vi.mock("@simplewebauthn/browser", () => ({ platformAuthenticatorIsAvailable: vi.fn(async () => true) }));
vi.mock("@/components/LogoutButton", () => ({ LogoutButton: () => <button>Sair</button> }));
beforeEach(() => {
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(window, "PublicKeyCredential", { configurable: true, value: class {} });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  vi.mocked(confirmDevice).mockResolvedValue(undefined);
  vi.mocked(deviceRequest).mockResolvedValue({});
});
function App({ enabled = true }: { enabled?: boolean }) {
  return <DeviceLockProvider initialEnabled={enabled}>
    <DeviceLockAction /><span>Rascunho privado</span>
  </DeviceLockProvider>;
}
it("renders locked from the server without showing the app", () => {
  const html = renderToString(<App />);
  expect(html).not.toContain("12.345,67");
});
it("unlocks after confirmation and relocks on background and pagehide", async () => {
  render(<App />);
  await screen.findByRole("button", { name: "Usar senha" });
  expect(screen.queryByText("Rascunho privado")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
  await screen.findByText("Rascunho privado");
  expect(confirmDevice).toHaveBeenCalledWith("unlock");
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(screen.getByText("Rascunho privado")).not.toBeVisible();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(screen.getByText("books bloqueado")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
  await screen.findByText("Rascunho privado");
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(screen.getByText("Rascunho privado")).not.toBeVisible();
});
it("keeps cancelled confirmations locked and offers password recovery", async () => {
  vi.mocked(confirmDevice).mockRejectedValueOnce(new Error("Confirmação cancelada."));
  render(<App />);
  await screen.findByRole("button", { name: "Usar senha" });
  fireEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
  await screen.findByText("Confirmação cancelada.");
  expect(screen.queryByText("Rascunho privado")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Usar senha" }));
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password" } });
  fireEvent.submit(screen.getByLabelText("Senha").closest("form")!);
  await screen.findByText("Rascunho privado");
  expect(deviceRequest).toHaveBeenCalledWith("password-unlock", { password: "password" });
});
it("enables only after registration succeeds and supports opt out", async () => {
  vi.mocked(confirmDevice).mockRejectedValueOnce(new Error("Cancelado"));
  render(<App enabled={false} />);
  fireEvent.click(await screen.findByRole("button", { name: "Desbloqueio do app" }));
  const toggle = screen.getByRole("switch");
  fireEvent.click(toggle);
  await screen.findByText("Cancelado");
  expect(toggle).not.toBeChecked();
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toBeChecked());
  expect(confirmDevice).toHaveBeenCalledWith("register");
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).not.toBeChecked());
  expect(confirmDevice).toHaveBeenCalledWith("disable");
});

it("keeps the same editor and draft after locking, including portal privacy", async () => {
  function Editor() {
    const [draft, setDraft] = useState("");
    return <>
      <input aria-label="Rascunho" value={draft} onChange={(event) => setDraft(event.target.value)} />
      {createPortal(<div data-testid="private-portal">Texto privado em diálogo</div>, document.body)}
    </>;
  }
  render(<DeviceLockProvider initialEnabled><Editor /></DeviceLockProvider>);
  await screen.findByRole("button", { name: "Usar senha" });
  fireEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
  const editor = await screen.findByLabelText("Rascunho");
  fireEvent.change(editor, { target: { value: "Texto ainda não salvo" } });
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(editor).not.toBeVisible();
  expect(screen.getByTestId("private-portal")).not.toBeVisible();
  expect(document.body).toHaveAttribute("data-books-locked", "true");
  expect(screen.getByRole("dialog").closest("[data-books-lock-root]")).toHaveAttribute("data-books-lock-root", "true");
  fireEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
  await waitFor(() => expect(editor).toBeVisible());
  expect(screen.getByLabelText("Rascunho")).toBe(editor);
  expect(editor).toHaveValue("Texto ainda não salvo");
  expect(screen.getByTestId("private-portal")).toBeVisible();
});
