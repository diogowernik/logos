import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import { LoginForm } from "@/components/LoginForm";

beforeEach(() => { router.replace.mockReset(); router.refresh.mockReset(); });

it("submits credentials and opens the protected home after success", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  render(<LoginForm />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Usuário"), "example");
  await user.type(screen.getByLabelText("Senha"), "password");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: "example", password: "password" });
  expect(router.replace).toHaveBeenCalledWith("/");
  expect(router.refresh).toHaveBeenCalled();
});

it("keeps the form available and displays a recoverable login error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Usuário ou senha inválidos." }, { status: 401 })));
  render(<LoginForm />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Usuário"), "example");
  await user.type(screen.getByLabelText("Senha"), "wrong");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Usuário ou senha inválidos.");
  expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  expect(router.replace).not.toHaveBeenCalled();
});
