import { beforeEach, expect, it, vi } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "./render";
const mocks = vi.hoisted(() => ({ download: vi.fn(), create: vi.fn(), destroy: vi.fn(), display: vi.fn(), next: vi.fn(), prev: vi.fn(), renderTo: vi.fn(), on: vi.fn() }));
vi.mock("@/api/client", () => ({ downloadRequest: mocks.download }));
vi.mock("epubjs", () => ({ default: mocks.create }));
import { EpubReadButton } from "@/features/library/EpubReader";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  mocks.download.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });
  mocks.display.mockResolvedValue(undefined);
  mocks.next.mockResolvedValue(undefined);
  mocks.prev.mockResolvedValue(undefined);
  mocks.renderTo.mockReturnValue({ display: mocks.display, next: mocks.next, prev: mocks.prev, on: mocks.on, resize: vi.fn() });
  mocks.create.mockReturnValue({ opened: Promise.resolve(), loaded: { navigation: Promise.resolve({ toc: [
    { id: "part", label: "Parte um", href: "part.xhtml", subitems: [{ id: "chapter", label: "Capítulo", href: "chapter.xhtml#start" }] },
  ] }) }, renderTo: mocks.renderTo, destroy: mocks.destroy });
});

it("loads privately only on demand, navigates nested TOC and disposes the reader on close", async () => {
  const user = userEvent.setup();
  render(<EpubReadButton url="/api/library/imports/book/original" filename="original.epub"/>);
  expect(mocks.download).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Ler original.epub" }));
  await waitFor(() => expect(mocks.display).toHaveBeenCalled());
  expect(mocks.download).toHaveBeenCalledWith("/api/library/imports/book/original", { signal: expect.any(AbortSignal) });
  expect(mocks.renderTo).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ allowScriptedContent: false, spread: "none" }));
  await user.click(screen.getByRole("button", { name: "Sumário" }));
  await user.click(screen.getByRole("button", { name: "Capítulo" }));
  expect(mocks.display).toHaveBeenCalledWith("chapter.xhtml#start");
  await user.click(screen.getByRole("button", { name: "Próxima" }));
  expect(mocks.next).toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Fechar leitura" }));
  expect(mocks.destroy).toHaveBeenCalledOnce();
  expect(mocks.download.mock.calls[0][1].signal.aborted).toBe(true);
});

it("shows load failures without opening or modifying a book", async () => {
  mocks.download.mockRejectedValue(new Error("Arquivo não encontrado."));
  render(<EpubReadButton url="/missing" filename="limpo.epub"/>);
  await userEvent.setup().click(screen.getByRole("button", { name: "Ler limpo.epub" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Arquivo não encontrado.");
  expect(mocks.create).not.toHaveBeenCalled();
});

it("ignores a download that completes after the modal closes", async () => {
  let finish!: (value: unknown) => void;
  mocks.download.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const user = userEvent.setup();
  render(<EpubReadButton url="/private" filename="revisado.epub"/>);
  await user.click(screen.getByRole("button", { name: "Ler revisado.epub" }));
  await user.click(screen.getByRole("button", { name: "Fechar leitura" }));
  await act(async () => { finish({ arrayBuffer: async () => new ArrayBuffer(8) }); });
  expect(mocks.create).not.toHaveBeenCalled();
});
