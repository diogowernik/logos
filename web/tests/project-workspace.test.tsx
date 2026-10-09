import { group } from "./group-fixture";
import { render } from "./render";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import type { ProjectContent } from "@/features/library/types";
import type { EpubImportJob } from "@/features/library/import-types";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  requireUser: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  usePathname: () => "/projects/1",
}));
vi.mock("@/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/features/library/api", () => ({
  libraryRequest: mocks.request,
  errorMessage: (e: Error) => e.message,
}));
import ProjectPage from "@/app/(app)/projects/[id]/page";
import { LibraryShell } from "@/features/library/LibraryShell";
import { ProjectEditor } from "@/features/library/ProjectEditor";

const project = {
  id: 1,
  title: "Livro A",
  subtitle: "",
  author: "",
  collection: 7,
  default_group: 1,
  is_inbox: false,
  text_count: 2,
  updated_at: "",
  cover: "cover-a",
  cover_url: "/api/library/assets/cover-a/file",
};
const chapters = [
  {
    id: 2,
    project: 1,
  group: 1,    parent: null,
    title: "Capítulo A",
    markdown: "# Capítulo A\n\nTexto A",
    position: 0,
  },
  {
    id: 3,
    project: 1,
  group: 1,    parent: null,
    title: "Capítulo B",
    markdown: "Texto B",
    position: 1,
  },
];
const asset = {
  id: "cover-b",
  original_name: "capa-b.png",
  mime_type: "image/png",
  url: "/api/library/assets/cover-b/file",
  created_at: "",
};
const content: ProjectContent = {
  project,
  texts: chapters,
  group, groups: [group],
  assets: [asset],
  epub: null,
};
const artifact = {
  filename: "livro-a.epub",
  url: "/api/library/groups/1/epub/file",
  created_at: "2026-10-08T12:00:00Z",
  sha256: "digest",
  source_sha256: "snapshot", is_current: true, compiler_version: "logos-epub-1",
  generation: 1,
};
let current: ProjectContent;

it("creates and selects an independent group without switching the book default", async () => {
  const user = userEvent.setup();
  mocks.request.mockImplementation((path, method, body) => {
    if (path === "groups" && method === "POST") {
      const newGroup = {...group, id: 8, name: body.name, is_default: false};
      current = {...content, group: newGroup, groups: [group, newGroup], texts: []};
      return Promise.resolve(newGroup);
    }
    if (path === "projects/1/content?group=1") current = {...current, group, texts: chapters};
    return defaults(path, method, body);
  });
  render(<LibraryShell><ProjectEditor projectId="1" /></LibraryShell>);
  await user.click(await screen.findByRole("button", {name: "Configurar grupos"}));
  await user.click(await screen.findByRole("button", {name: "Novo grupo de textos"}));
  const dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText(/Nome/), "Revisão humana");
  await user.click(within(dialog).getByRole("button", {name: "Salvar"}));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith("projects/1/content?group=8"));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(current.project.default_group).toBe(1);
  expect(mocks.request.mock.calls.some(([path]) => path.endsWith("/default"))).toBe(false);
  await user.click(screen.getByRole("combobox", {name: "Grupo de textos"}));
  await user.click(screen.getByRole("option", {name: "Textos"}));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith("projects/1/content?group=1"));
  expect(await screen.findByRole("combobox", {name: "Grupo de textos"})).toHaveTextContent("Textos");
});

function defaults(path: string, method?: string, body?: { cover?: string }) {
  if (path === "texts/2") return Promise.resolve(chapters[0]);
  if (path === "projects") return Promise.resolve([current.project]);
  if (path === "collections")
    return Promise.resolve([
      { id: 7, title: "Coleção A", description: "", position: 0 },
    ]);
  if (path.startsWith("projects/1/content")) return Promise.resolve(current);
  if (path === "groups/1/epub" && method === "POST") {
    current = { ...current, epub: artifact };
    return Promise.resolve(artifact);
  }
  if (path === "projects/1" && method === "PATCH") {
    current = {
      ...current,
      project: { ...project, cover: body?.cover, cover_url: asset.url },
    };
    return Promise.resolve(current.project);
  }
  return Promise.resolve([]);
}

beforeEach(() => {
  localStorage.removeItem("logos.book.1.layout");
  vi.clearAllMocks();
  mocks.request.mockReset();
  current = content;
  mocks.request.mockImplementation(defaults);
  window.matchMedia = vi.fn((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

it("opens the protected project route in the center with its operations and an empty right panel", async () => {
  const page = await ProjectPage({
    params: Promise.resolve({ id: "1" }),
  });
  expect(mocks.requireUser).toHaveBeenCalledOnce();
  render(<LibraryShell>{page}</LibraryShell>);
  const main = screen.getByRole("main");
  const panel = main;
  await within(main).findByRole("heading", { name: "Livro A" });
  expect(screen.getByRole("button", { name: "Mostrar painel de trabalho" })).toHaveAttribute("aria-expanded", "false");
  await userEvent.setup().click(screen.getByRole("button", {name: "Capa e informações"}));
  expect(within(panel).getByRole("button", { name: "Trocar capa" })).toBeEnabled();
  expect(
    within(main).queryByRole("button", { name: "Buscar na biblioteca" }),
  ).not.toBeInTheDocument();
  expect(
    within(main).getByRole("link", { name: "Biblioteca" }),
  ).toHaveAttribute("href", "/");
  expect(within(main).getByRole("link", { name: "Coleção A" })).toHaveAttribute(
    "href",
    "/?collection=7",
  );
  expect(
    within(panel).getByRole("link", { name: "Editar Capítulo A" }),
  ).toHaveAttribute("href", "/texts/2");
  expect(
    within(panel).getByRole("link", { name: "Adicionar texto" }),
  ).toHaveAttribute("href", "/projects/1/new?group=1");
  const user = userEvent.setup();
  within(panel).getByRole("button", { name: "Reordenar Capítulo A" }).focus();
  await user.keyboard("{ArrowDown}");
  expect(mocks.request).toHaveBeenCalledWith("groups/1/reorder", "POST", {
    ids: [3, 2],
  });
  expect(
    within(panel)
      .getAllByRole("button", { name: /^Capítulo [AB]$/ })
      .map((link) => link.textContent),
  ).toEqual(["Capítulo B", "Capítulo A"]);
  await user.click(within(panel).getByRole("button", { name: "Gerar EPUB" }));
  const download = await within(panel).findByRole("link", {
    name: "Baixar EPUB",
  });
  expect(download).toHaveAttribute("href", artifact.url);
  expect(download).toHaveAttribute("download", artifact.filename);
  expect(within(panel).getByText(/^Gerado em/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Imagens e arquivos" }));
  await user.click(
    within(panel).getByRole("button", { name: "Usar capa-b.png como capa" }),
  );
  expect(mocks.request).toHaveBeenCalledWith("projects/1", "PATCH", {
    cover: "cover-b",
  });
  await waitFor(() =>
    expect(
      within(main).getByRole("img", { name: "Capa de Livro A" }),
    ).toHaveAttribute("src", asset.url),
  );
});

it("keeps the central book workspace while panels collapse and opens the existing editor with its preview", async () => {
  current = { ...content, epub: artifact };
  const view = render(
    <LibraryShell>
      <ProjectEditor key="1" projectId="1" />
    </LibraryShell>,
  );
  const user = userEvent.setup();
  await screen.findByRole("heading", {name: "Livro A"});
  const download = await screen.findByRole("link", { name: "Baixar EPUB" });
  await user.click(screen.getByRole("button", { name: "Mostrar painel de trabalho" }));
  await user.click(
    screen.getByRole("button", { name: "Ocultar painel de trabalho" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Mostrar painel de trabalho" }),
  );
  expect(screen.getByRole("link", { name: "Baixar EPUB" })).toBe(download);
  view.rerender(
    <LibraryShell>
      <ProjectEditor projectId="1" initialView="text" initialTextId={2} />
    </LibraryShell>,
  );
  const input = await screen.findByLabelText("Conteúdo Markdown");
  expect(
    screen.queryByRole("heading", { name: "Sumário" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("article", { name: "Texto renderizado" }),
  ).toHaveTextContent("Texto A");
  await user.type(input, " ainda não salvo");
  await user.click(
    screen.getByRole("button", { name: "Ocultar painel de trabalho" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Mostrar painel de trabalho" }),
  );
  expect(screen.getByLabelText("Conteúdo Markdown")).toBe(input);
  expect(input).toHaveValue(`${chapters[0].markdown} ainda não salvo`);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const link = within(screen.getByRole("main")).getByRole("link", {
    name: "Livro A",
  });
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  act(() => {
    link.dispatchEvent(click);
  });
  expect(confirm).toHaveBeenCalledWith(
    "Há alterações não salvas. Descartar essas alterações?",
  );
  expect(click.defaultPrevented).toBe(true);
  expect(input).toHaveValue(`${chapters[0].markdown} ainda não salvo`);
  confirm.mockRestore();
});

it("ignores a late response from the previously selected book", async () => {
  const other = { ...project, id: 9, title: "Livro novo", default_group: 9 };
  let completeOld!: (value: ProjectContent) => void;
  mocks.request.mockImplementation((path: string) => {
    if (path === "texts/2") return Promise.resolve(chapters[0]);
  if (path === "projects") return Promise.resolve([project, other]);
    if (path.startsWith("projects/1/content"))
      return new Promise((resolve) => {
        completeOld = resolve;
      });
    if (path.startsWith("projects/9/content"))
      return Promise.resolve({ project: other, texts: [], group: {...group, id: 9, project: 9}, groups: [{...group, id: 9, project: 9}] });
    return defaults(path);
  });
  const view = render(
    <LibraryShell>
      <ProjectEditor key="1" projectId="1" />
    </LibraryShell>,
  );
  await screen.findByText("Carregando projeto…");
  view.rerender(
    <LibraryShell>
      <ProjectEditor key="9" projectId="9" />
    </LibraryShell>,
  );
  const panel = screen.getByRole("main");
  await within(panel).findByRole("heading", { name: "Livro novo" });
  await act(async () => {
    completeOld(content);
  });
  expect(
    within(panel).queryByRole("heading", { name: "Livro A" }),
  ).not.toBeInTheDocument();
  expect(
    within(panel).queryByRole("button", { name: "Capítulo A" }),
  ).not.toBeInTheDocument();
});

it("opens the book centrally on mobile without automatically opening the empty right panel", async () => {
  window.matchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  render(
    <LibraryShell>
      <ProjectEditor key="1" projectId="1" />
    </LibraryShell>,
  );
  const main = screen.getByRole("main");
  await within(main).findByRole("heading", { name: "Livro A" });
  expect(
    screen.getByRole("button", { name: "Mostrar painel de trabalho" }),
  ).toHaveAttribute("aria-expanded", "false");
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Mostrar painel de trabalho" }));
  const close = await screen.findByRole("button", {
    name: "Fechar painel de trabalho",
  });
  const right = close.closest<HTMLElement>("#app-right-panel");
  expect(right).not.toBeNull();
  expect(
    within(right!).queryByRole("heading", { name: "Sumário" }),
  ).not.toBeInTheDocument();
  await userEvent.setup().keyboard("{Escape}");
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Fechar painel de trabalho" }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole("button", { name: "Mostrar painel de trabalho" }),
  ).toHaveAttribute("aria-expanded", "false");
});

it("opens a compact panel with independent areas and labels future tools without making mutations", async () => {
  render(<LibraryShell><ProjectEditor key="1" projectId="1" /></LibraryShell>);
  await screen.findByRole("heading", {name: "Livro A"});
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  expect(screen.getByRole("button", {name: "Capa e informações"})).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", {name: "Textos"})).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", {name: "Markdown"})).toHaveAttribute("aria-expanded", "true");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", {name: "Editar informações"}));
  expect(screen.getByRole("dialog", {name: "Editar projeto"})).toBeVisible();
  await user.click(screen.getByRole("button", {name: "Cancelar"}));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await user.click(screen.getByRole("button", {name: "Imagens e arquivos"}));
  const files = screen.getByRole("region", {name: "Imagens e arquivos"});
  expect(within(files).getByRole("button", {name: "Enviar arquivo (em planejamento)"})).toBeDisabled();
  expect(within(files).getByRole("button", {name: "Excluir capa-b.png (em planejamento)"})).toBeDisabled();
  expect(within(files).queryByRole("button", {name: /EPUB|Extrair textos/})).not.toBeInTheDocument();
  expect(screen.getByRole("button", {name: "Importar EPUB"})).toBeEnabled();
  expect(screen.getByRole("button", {name: "Gerar EPUB"})).toBeEnabled();
  expect(mocks.request.mock.calls.some(([, method]) => method && method !== "GET")).toBe(false);
});

it("preserves an in-flight generation and its failure while its area is collapsed", async () => {
  current = { ...content, epub: artifact };
  let rejectGeneration!: (error: Error) => void;
  mocks.request.mockImplementation((path: string, method?: string) => {
    if (path === "groups/1/epub" && method === "POST")
      return new Promise((_, reject) => {
        rejectGeneration = reject;
      });
    return defaults(path, method);
  });
  render(
    <LibraryShell>
      <ProjectEditor key="1" projectId="1" />
    </LibraryShell>,
  );
  const user = userEvent.setup();
  await screen.findByRole("heading", {name: "Livro A"});
  await user.click(screen.getByRole("button", { name: "Gerar novamente" }));
  expect(screen.getByRole("button", { name: "Gerando EPUB…" })).toBeDisabled();
  expect(screen.getByRole("combobox", {name: "Grupo de textos"})).toHaveAttribute("aria-disabled", "true");
  await user.click(screen.getByRole("button", {name: "Configurar grupos"}));
  expect(screen.getByRole("button", {name: "Novo grupo de textos"})).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Textos", expanded: true }));
  await act(async () => {
    rejectGeneration(new Error("Falha ao gerar"));
  });
  await user.click(screen.getByRole("button", {name: "Textos", expanded: false}));
  expect(screen.getByRole("alert")).toHaveTextContent("Falha ao gerar");
  expect(screen.getByRole("link", { name: "Baixar EPUB" })).toHaveAttribute(
    "href",
    artifact.url,
  );
  expect(screen.getByRole("button", { name: "Gerar novamente" })).toBeEnabled();
});

it("collapses chapters in overview, expands them for editing and preserves manual navigation choices", async () => {
  const view = render(
    <LibraryShell>
      <ProjectEditor key="overview" projectId="1" />
    </LibraryShell>,
  );
  const sidebar = screen.getByRole("navigation", {
    name: "Navegação da biblioteca",
  });
  await screen.findByRole("heading", { name: "Livro A" });
  await waitFor(() =>
    expect(
      within(sidebar).getByRole("button", { name: "Expandir Livro A" }),
    ).toHaveAttribute("aria-expanded", "false"),
  );
  view.rerender(
    <LibraryShell>
      <ProjectEditor
        key="text"
        projectId="1"
        initialView="text"
        initialTextId={2}
      />
    </LibraryShell>,
  );
  await screen.findByLabelText("Conteúdo Markdown");
  const collapse = await within(sidebar).findByRole("button", {
    name: "Recolher Livro A",
  });
  const user = userEvent.setup();
  await user.click(collapse);
  view.rerender(
    <LibraryShell>
      <ProjectEditor key="overview-again" projectId="1" />
    </LibraryShell>,
  );
  await screen.findByRole("heading", { name: "Livro A" });
  expect(
    within(sidebar).getByRole("button", { name: "Expandir Livro A" }),
  ).toHaveAttribute("aria-expanded", "false");
  await user.click(
    within(sidebar).getByRole("button", { name: "Expandir Livro A" }),
  );
  view.rerender(
    <LibraryShell>
      <ProjectEditor key="overview-revisited" projectId="1" />
    </LibraryShell>,
  );
  await screen.findByRole("heading", { name: "Livro A" });
  expect(
    within(sidebar).getByRole("button", { name: "Recolher Livro A" }),
  ).toHaveAttribute("aria-expanded", "true");
});

it("refreshes the central chapter list and files after extracting into the current project", async () => {
  const job: EpubImportJob = {
    id: "import", original_name: "livro.epub", original_url: "/original", sha256: "hash",
    clean_url: null, clean_filename: "", clean_sha256: "", clean_generation: 0, clean_report: {},
    inspection: { title: "Livro", language: "pt-BR", warnings: [], sections: [] },
    status: "ready", error: "", error_diagnostic: {}, created_at: "",
  };
  current = { ...content, imports: [job] };
  mocks.request.mockImplementation((path: string, method?: string, body?: { cover?: string }) => {
    if (path.includes("/preview?")) return Promise.resolve({ group: 1, source: "original", source_sha256: "hash", group_state: "state", requires_confirmation: true,
      existing_text_count: 2, existing_primary_count: 2, warnings: [], sections: [{ href: "new.xhtml", title: "Extraído", position: 0, markdown: "Conteúdo extraído" }] });
    if (path === "epub-imports/import/extract") {
      current = { ...current, texts: [...chapters, { ...chapters[0], id: 44, title: "Extraído", markdown: "Conteúdo extraído", position: 2 }],
        assets: [...(current.assets ?? []), { ...asset, id: "new-image", original_name: "ilustracao.png" }] };
      return Promise.resolve({ group: 1, source: "original", mode: "append", text_ids: [44], reused: false });
    }
    return defaults(path, method, body);
  });
  render(<LibraryShell><ProjectEditor key="1" projectId="1" /></LibraryShell>);
  const user = userEvent.setup();
  await screen.findByRole("button", {name: "EPUBs de origem"});
  await user.click(screen.getByRole("button", { name: "Criar textos a partir do EPUB original" }));
  const dialog = await screen.findByRole("dialog", { name: "Extrair textos do original" });
  await user.click(await within(dialog).findByRole("radio", { name: "Acrescentar ao final, mantendo os textos existentes" }));
  await user.click(within(dialog).getByRole("button", { name: "Extrair textos" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(within(screen.getByRole("region", { name: "Textos" })).getByRole("link", { name: "Editar Extraído" })).toHaveAttribute("href", "/texts/44");
  await user.click(screen.getByRole("button", { name: "Imagens e arquivos" }));
  expect(screen.getByRole("link", { name: "ilustracao.png" })).toBeVisible();
});


it("reads the last selected Text or Markdown laterally and keeps editing explicit", async () => {
  mocks.request.mockImplementation((path, method, body) => {
    if (path.startsWith("projects/1/markdown-files")) return Promise.resolve([{ name: "fonte.md", size: 20, sha256: "hash", status: "new" }]);
    if (path === "projects/1/markdown-preview") return Promise.resolve({ sections: [{ markdown: "# Fonte\n\nConteúdo do arquivo" }] });
    return defaults(path, method, body);
  });
  const user = userEvent.setup();
  render(<LibraryShell><ProjectEditor projectId="1" /></LibraryShell>);
  await screen.findByRole("heading", {name: "Livro A"});
  const texts = screen.getByRole("region", { name: "Textos" });
  const title = within(texts).getByRole("button", { name: "Capítulo A" });
  title.focus();
  await user.keyboard("{Enter}");
  const reading = await screen.findByRole("article", { name: "Leitura de Capítulo A" });
  expect(within(reading).getByRole("heading", { name: "Capítulo A" })).toBeVisible();
  expect(within(reading).getByText("Texto A")).toBeVisible();
  expect(within(texts).getByRole("link", { name: "Editar Capítulo A" })).toHaveAttribute("href", "/texts/2");
  expect(screen.queryByLabelText("Conteúdo Markdown")).not.toBeInTheDocument();
  expect(mocks.router.push).not.toHaveBeenCalled();

  await user.click(within(texts).getByRole("button", { name: "Capítulo B" }));
  expect(await screen.findByRole("article", { name: "Leitura de Capítulo B" })).toHaveTextContent("Texto B");
  expect(screen.queryByRole("article", { name: "Leitura de Capítulo A" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Ocultar painel de trabalho" }));
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  await user.click(within(texts).getByRole("button", { name: "Capítulo B" }));
  expect(await screen.findByRole("article", { name: "Leitura de Capítulo B" })).toBeVisible();

  await user.click(await screen.findByRole("button", {name: "fonte.md"}));
  expect(await screen.findByRole("article", {name: "Leitura de fonte.md"})).toHaveTextContent("Conteúdo do arquivo");
  expect(screen.queryByRole("article", {name: "Leitura de Capítulo B"})).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", {name: "Markdown"}));
  expect(screen.getByRole("article", {name: "Leitura de fonte.md"})).toBeVisible();
  await user.click(within(texts).getByRole("button", {name: "Capítulo A"}));
  expect(await screen.findByRole("article", {name: "Leitura de Capítulo A"})).toBeVisible();
  expect(mocks.request.mock.calls.filter(([, method]) => method && method !== "GET")).toEqual([
    ["projects/1/markdown-preview", "POST", { files: ["fonte.md"], group: 1 }],
  ]);
});

it("closes the empty book panel while preserving the editor's previous preview preference", async () => {
  const view = render(<LibraryShell><ProjectEditor key="book" projectId="1" /></LibraryShell>);
  await screen.findByRole("heading", {name: "Livro A"});
  expect(screen.getByRole("button", { name: "Mostrar painel de trabalho" })).toHaveAttribute("aria-expanded", "false");
  view.rerender(<LibraryShell><ProjectEditor key="text" projectId="1" initialView="text" initialTextId={2} /></LibraryShell>);
  await screen.findByLabelText("Conteúdo Markdown");
  expect(await screen.findByRole("article", { name: "Texto renderizado" })).toHaveTextContent("Texto A");
});

it("copies each text independently and keeps a single add action without visible numbering", async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
  current = {...content, texts: [{...chapters[0], compiled_markdown: "## Capítulo A\n\nTexto compilado"}, chapters[1]]};
  render(<LibraryShell><ProjectEditor projectId="1" /></LibraryShell>);
  const texts = await screen.findByRole("region", {name: "Textos"});
  await user.click(within(texts).getByRole("button", {name: "Copiar Capítulo A"}));
  await waitFor(() => expect(write).toHaveBeenCalledWith("## Capítulo A\n\nTexto compilado"));
  expect(within(texts).getAllByRole("link", {name: "Adicionar texto"})).toHaveLength(1);
  expect(within(texts).queryByText("01")).not.toBeInTheDocument();
  expect(within(texts).queryByText(/palavras/)).not.toBeInTheDocument();
  expect(mocks.request).not.toHaveBeenCalledWith("groups/1/markdown");
});

it("remembers independent collapsed areas for this book and restores them after reopening", async () => {
  const user = userEvent.setup();
  const view = render(<LibraryShell><ProjectEditor key="first" projectId="1" /></LibraryShell>);
  await user.click(await screen.findByRole("button", {name: "Textos"}));
  await user.click(screen.getByRole("button", {name: "Imagens e arquivos"}));
  expect(JSON.parse(localStorage.getItem("logos.book.1.layout")!)).toMatchObject({texts: false, files: true, markdown: true});
  expect(localStorage.getItem("logos.book.9.layout")).toBeNull();
  view.rerender(<LibraryShell><ProjectEditor key="reopened" projectId="1" /></LibraryShell>);
  await waitFor(() => expect(screen.getByRole("button", {name: "Textos"})).toHaveAttribute("aria-expanded", "false"));
  expect(screen.getByRole("button", {name: "Imagens e arquivos"})).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", {name: "Markdown"})).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("combobox", {name: "Grupo de textos"})).toBeEnabled();
});
