import { render } from "./render";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  usePathname: () => "/",
}));
vi.mock("@/features/library/api", () => ({
  libraryRequest: mocks.request,
  errorMessage: (e: Error) => e.message,
}));
import { Library } from "@/features/library/Library";
import { LibraryShell } from "@/features/library/LibraryShell";
import { ProjectEditor } from "@/features/library/ProjectEditor";
import { OpenText } from "@/features/library/OpenText";

const project = {
  id: 1,
  family_id: 1,
  title: "Meu projeto",
  subtitle: "",
  author: "",
  collection: null,
  is_principal: true,
  is_inbox: false,
  text_count: 1,
  updated_at: "",
};
const text = {
  id: 2,
  project: 1,
  title: "Ideia",
  markdown: "Primeiro texto",
  compiled_markdown: "## Ideia\n\nPrimeiro texto",
  parent: null,
  position: 0,
};
const content = { project, texts: [text], versions: [project] };

function defaults(path: string) {
  return Promise.resolve(
    path.endsWith("content")
      ? content
      : path === "projects"
        ? [project]
        : path === "texts/2/open"
          ? text
          : [],
  );
}
beforeEach(() => {
  mocks.request.mockReset();
  mocks.router.push.mockReset();
  mocks.router.replace.mockReset();
});

it("creates a project with only its title and opens its overview", async () => {
  mocks.request.mockResolvedValue([]);
  render(
    <LibraryShell>
      <Library />
    </LibraryShell>,
  );
  await screen.findByText("Seu próximo texto começa aqui");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Criar projeto" }));
  await user.type(screen.getByLabelText("Título"), "Meu projeto");
  mocks.request.mockImplementation((path, method) =>
    method === "POST" ? Promise.resolve(project) : Promise.resolve([]),
  );
  await user.click(screen.getByRole("button", { name: "Criar" }));
  expect(mocks.request).toHaveBeenCalledWith("projects", "POST", {
    title: "Meu projeto",
    collection: null,
  });
  expect(mocks.router.push).toHaveBeenCalledWith("/projects/1");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

it("searches projects and text content in a dialog and returns focus when closed", async () => {
  mocks.request.mockImplementation((path: string) => {
    if (path === "projects?search=ideia") return Promise.resolve([project]);
    if (path === "texts?search=ideia")
      return Promise.resolve([
        { ...text, is_loose: false, project_title: project.title },
      ]);
    return defaults(path);
  });
  render(
    <LibraryShell>
      <Library />
    </LibraryShell>,
  );
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: "Buscar na biblioteca" });
  expect(
    screen.getByRole("button", { name: "Filtros (em planejamento)" }),
  ).toBeDisabled();
  await user.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Buscar na biblioteca" });
  const input = within(dialog).getByRole("searchbox", {
    name: "Buscar projetos e textos",
  });
  await waitFor(() => expect(input).toHaveFocus());
  await user.type(input, "ideia");
  const projects = await within(dialog).findByRole("list", {
    name: "Projetos encontrados",
  });
  const texts = within(dialog).getByRole("list", {
    name: "Textos encontrados",
  });
  expect(
    within(projects).getByRole("link", { name: "Meu projeto" }),
  ).toHaveAttribute("href", "/projects/1");
  expect(within(texts).getByRole("link", { name: /Ideia/ })).toHaveAttribute(
    "href",
    "/texts/2",
  );
  expect(mocks.request).toHaveBeenCalledWith("texts?search=ideia");
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveFocus();
});

it("keeps the newest search results when an earlier request finishes later", async () => {
  let completeOld!: (value: (typeof project)[]) => void;
  mocks.request.mockImplementation((path: string) => {
    if (path === "projects?search=antigo")
      return new Promise((resolve) => {
        completeOld = resolve;
      });
    if (path === "texts?search=antigo") return Promise.resolve([]);
    if (path === "projects?search=novo")
      return Promise.resolve([{ ...project, title: "Resultado novo" }]);
    if (path === "texts?search=novo") return Promise.resolve([]);
    return defaults(path);
  });
  render(
    <LibraryShell>
      <Library />
    </LibraryShell>,
  );
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Buscar na biblioteca" }),
  );
  const dialog = screen.getByRole("dialog");
  const input = within(dialog).getByRole("searchbox");
  await user.type(input, "antigo");
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith("projects?search=antigo"),
  );
  await user.clear(input);
  await user.type(input, "novo");
  expect(
    await within(dialog).findByRole("link", { name: "Resultado novo" }),
  ).toBeVisible();
  await act(async () => {
    completeOld([{ ...project, title: "Resultado antigo" }]);
  });
  expect(
    within(dialog).queryByText("Resultado antigo"),
  ).not.toBeInTheDocument();
  expect(
    within(dialog).getByRole("link", { name: "Resultado novo" }),
  ).toBeVisible();
});

it("opens the search dialog for the existing search entry point", async () => {
  mocks.request.mockImplementation(defaults);
  render(
    <LibraryShell>
      <Library autofocus />
    </LibraryShell>,
  );
  expect(
    await screen.findByRole("dialog", { name: "Buscar na biblioteca" }),
  ).toBeVisible();
});

it("saves Markdown without asking for author, language or publication status", async () => {
  mocks.request.mockImplementation(defaults);
  render(
    <LibraryShell>
      <ProjectEditor projectId="1" initialView="text" initialTextId={2} />
    </LibraryShell>,
  );
  const input = await screen.findByLabelText("Conteúdo Markdown");
  const user = userEvent.setup();
  await user.type(input, " atualizado");
  mocks.request.mockImplementation((path: string, method: string) =>
    method === "PATCH"
      ? Promise.resolve({ ...text, markdown: "Primeiro texto atualizado" })
      : defaults(path),
  );
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(mocks.request).toHaveBeenCalledWith("texts/2", "PATCH", {
    title: "Ideia",
    markdown: "Primeiro texto atualizado",
  });
  expect(await screen.findByRole("status")).toHaveTextContent("Salvo");
});

it("keeps the draft on failure and toggles preview without losing edits", async () => {
  mocks.request.mockImplementation(defaults);
  render(
    <LibraryShell>
      <ProjectEditor projectId="1" initialView="text" initialTextId={2} />
    </LibraryShell>,
  );
  const input = await screen.findByLabelText("Conteúdo Markdown");
  const user = userEvent.setup();
  await user.clear(input);
  await user.type(input, "## Minha ideia\n\nTexto **importante**.");
  mocks.request.mockRejectedValueOnce(new Error("Sem conexão"));
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão");
  expect(input).toHaveValue("## Minha ideia\n\nTexto **importante**.");
  await user.click(screen.getByRole("button", { name: "Ocultar preview" }));
  expect(
    screen.queryByRole("article", { name: "Texto renderizado" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getAllByRole("button", { name: "Mostrar preview" })[0],
  );
  expect(screen.getByRole("heading", { name: "Minha ideia" })).toBeVisible();
  expect(screen.getByLabelText("Conteúdo Markdown")).toHaveValue(
    "## Minha ideia\n\nTexto **importante**.",
  );
});

it("keeps identity in overview and copies the ordered Markdown from the Texts tab", async () => {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
  const compilation = "## Ideia\n\nPrimeiro texto\n\n## Continuação\n\nSegundo texto\n";
  mocks.request.mockImplementation((path: string) =>
    path.endsWith("markdown")
      ? Promise.resolve({
          markdown: compilation,
        })
      : defaults(path),
  );
  render(
    <LibraryShell>
      <ProjectEditor projectId="1" />
    </LibraryShell>,
  );
  const overview = await screen.findByRole("tabpanel", { name: "Visão geral" });
  expect(within(overview).getByRole("heading", { name: "Meu projeto" })).toBeVisible();
  expect(within(overview).getByRole("button", { name: "Editar informações" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Copiar todos os textos" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Ler livro" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Textos" }));
  expect(await screen.findByRole("heading", { name: "Sumário" })).toBeVisible();
  expect(screen.queryByLabelText("Conteúdo Markdown")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reordenar Ideia" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Meu projeto" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Editar informações" })).not.toBeInTheDocument();
  const texts = screen.getByRole("tabpanel", { name: "Textos" });
  await user.click(within(texts).getByRole("button", { name: "Copiar todos os textos" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(compilation));
  expect(mocks.request).toHaveBeenCalledWith("projects/1/markdown");
  expect(within(texts).getByRole("status")).toHaveTextContent("Markdown copiado");
  expect(mocks.router.push).not.toHaveBeenCalled();
});

it("reads the same compilation used for copying", async () => {
  mocks.request.mockImplementation((path: string) =>
    path.endsWith("markdown")
      ? Promise.resolve({
          markdown: "# Meu projeto\n\n## Ideia\n\nPrimeiro texto",
        })
      : defaults(path),
  );
  render(
    <LibraryShell>
      <ProjectEditor projectId="1" initialView="book" />
    </LibraryShell>,
  );
  expect(await screen.findByRole("heading", { name: "Ideia" })).toBeVisible();
  expect(mocks.request).toHaveBeenCalledWith("projects/1/markdown");
});

it("starts a loose draft without creating an empty text, then saves and opens it", async () => {
  const looseProject = {
    ...project,
    id: 9,
    title: "Caixa de entrada",
    is_inbox: true,
  };
  mocks.request.mockImplementation((path: string, method: string) =>
    Promise.resolve(
      path === "projects/inbox"
        ? looseProject
        : path.endsWith("content")
          ? { project: looseProject, texts: [], versions: [looseProject] }
          : method === "POST" && path === "texts"
            ? { ...text, id: 10, project: 9 }
            : [],
    ),
  );
  render(
    <LibraryShell>
      <OpenText />
    </LibraryShell>,
  );
  const input = await screen.findByLabelText("Conteúdo Markdown");
  expect(screen.queryByText("Caixa de entrada")).not.toBeInTheDocument();
  expect(mocks.request).not.toHaveBeenCalledWith(
    "texts",
    "POST",
    expect.anything(),
  );
  const user = userEvent.setup();
  await user.type(input, "Ideia livre");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(mocks.request).toHaveBeenCalledWith("texts", "POST", {
    project: 9,
    title: "",
    markdown: "Ideia livre",
  });
  expect(mocks.router.replace).toHaveBeenCalledWith("/texts/10");
});

it("adds a recent loose text to a project through its menu", async () => {
  const loose = { ...text, project: 9, is_loose: true, project_title: "" };
  mocks.request.mockImplementation((path: string) =>
    path === "texts/recent" ? Promise.resolve([loose]) : defaults(path),
  );
  render(
    <LibraryShell>
      <Library />
    </LibraryShell>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByLabelText("Opções de Ideia"));
  await user.click(
    screen.getByRole("menuitem", { name: "Adicionar ao projeto…" }),
  );
  const dialog = screen.getByRole("dialog");
  await user.selectOptions(
    within(dialog).getByLabelText(/Projeto de destino/),
    "1",
  );
  await user.click(within(dialog).getByRole("button", { name: /^Adicionar$/ }));
  expect(mocks.request).toHaveBeenCalledWith("texts/2/move", "POST", {
    project: 1,
  });
});

it("opens the right panel empty in the library and removes the editor preview on route change", async () => {
  mocks.request.mockImplementation(defaults);
  const view = render(
    <LibraryShell>
      <ProjectEditor projectId="1" initialView="text" initialTextId={2} />
    </LibraryShell>,
  );
  expect(
    await screen.findByRole("article", { name: "Texto renderizado" }),
  ).toBeVisible();
  view.rerender(
    <LibraryShell>
      <Library />
    </LibraryShell>,
  );
  expect(
    screen.queryByRole("article", { name: "Texto renderizado" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("complementary", { name: "Painel de trabalho" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Ocultar painel de trabalho" }),
  ).toHaveAttribute("aria-expanded", "true");
});

it("reorders primary chapters with the keyboard without saving editor content", async () => {
  const second = { ...text, id: 3, title: "Segunda ideia", position: 1 };
  mocks.request.mockImplementation((path: string) =>
    path.endsWith("content")
      ? Promise.resolve({ ...content, texts: [text, second] })
      : defaults(path),
  );
  render(
    <LibraryShell>
      <ProjectEditor projectId="1" />
    </LibraryShell>,
  );
  await userEvent.setup().click(await screen.findByRole("tab", { name: "Textos" }));
  const handle = await screen.findByRole("button", { name: "Reordenar Ideia" });
  handle.focus();
  await userEvent.setup().keyboard("{ArrowDown}");
  expect(mocks.request).toHaveBeenCalledWith("projects/1/reorder", "POST", {
    ids: [3, 2],
  });
  expect(mocks.request).not.toHaveBeenCalledWith(
    "texts/2",
    "PATCH",
    expect.anything(),
  );
});
