import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn(), router: { push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/features/library/api", () => ({ libraryRequest: mocks.request, errorMessage: (e: Error) => e.message }));
import { Library } from "@/features/library/Library";
import { ProjectEditor } from "@/features/library/ProjectEditor";

const project = { id: 1, family_id: 1, title: "Meu projeto", subtitle: "", author: "", collection: null, is_principal: true, is_inbox: false, text_count: 1, updated_at: "" };
const text = { id: 2, project: 1, title: "Ideia", markdown: "Primeiro texto", parent: null, position: 0 };
const content = { project, texts: [text], versions: [project] };

beforeEach(() => { mocks.request.mockReset(); mocks.router.push.mockReset(); });

it("creates a project with only its title and opens the editor", async () => {
  mocks.request.mockResolvedValue([]);
  render(<Library />);
  await screen.findByText("Seu próximo texto começa aqui");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "+ Projeto" }));
  await user.type(screen.getByLabelText("Título"), "Meu projeto");
  mocks.request.mockResolvedValueOnce(project);
  await user.click(screen.getByRole("button", { name: "Criar" }));
  expect(mocks.request).toHaveBeenCalledWith("projects", "POST", { title: "Meu projeto", collection: null });
  expect(mocks.router.push).toHaveBeenCalledWith("/projects/1");
});

it("saves Markdown without asking for author, language or publication status", async () => {
  mocks.request.mockImplementation((path: string) => Promise.resolve(path.endsWith("content") ? content : path === "projects" ? [project] : []));
  render(<ProjectEditor projectId="1" />);
  const input = await screen.findByLabelText("Conteúdo Markdown");
  const user = userEvent.setup();
  await user.type(input, " atualizado");
  mocks.request.mockImplementation((path: string, method: string) => Promise.resolve(method === "PATCH" ? { ...text, markdown: "Primeiro texto atualizado" } : content));
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(mocks.request).toHaveBeenCalledWith("texts/2", "PATCH", { title: "Ideia", markdown: "Primeiro texto atualizado" });
  expect(await screen.findByRole("status")).toHaveTextContent("Salvo");
});

it("keeps the edited draft when saving fails and renders a Markdown preview", async () => {
  mocks.request.mockImplementation((path: string) => Promise.resolve(path.endsWith("content") ? content : []));
  render(<ProjectEditor projectId="1" />);
  const input = await screen.findByLabelText("Conteúdo Markdown");
  const user = userEvent.setup();
  await user.clear(input); await user.type(input, "## Minha ideia\n\nTexto **importante**.");
  mocks.request.mockRejectedValueOnce(new Error("Sem conexão"));
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão");
  expect(input).toHaveValue("## Minha ideia\n\nTexto **importante**.");
  await user.click(screen.getByRole("button", { name: "Preview" }));
  expect(screen.getByRole("heading", { name: "Minha ideia" })).toBeVisible();
  expect(screen.getByText("importante").tagName).toBe("STRONG");
});
