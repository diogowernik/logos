import { group } from "./group-fixture";
import { useState } from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { ApiError } from "@/api/client";
import type { EpubImportJob, ExtractionPreview } from "@/features/library/import-types";

const mocks = vi.hoisted(() => ({ request: vi.fn(), extracted: vi.fn(), busy: vi.fn(), copy: vi.fn() }));
vi.mock("@/features/library/api", () => ({ libraryRequest: (path: string, ...args: unknown[]) => path.endsWith("/local-epubs") ? Promise.resolve([]) : mocks.request(path, ...args), errorMessage: (error: Error) => error.message }));
import { ProjectEpubs } from "@/features/library/ProjectEpubs";

const job: EpubImportJob = {
  id: "job-1", original_name: "fonte.epub", original_url: "/api/library/epub-imports/job-1/original",
  sha256: "original-hash", clean_url: null, clean_filename: "", clean_sha256: "", clean_generation: 0,
  status: "ready", error: "", error_diagnostic: {}, created_at: "2026-10-08T10:00:00Z",
  inspection: { title: "Livro", language: "pt-BR", warnings: [], sections: [
    { href: "cover.xhtml", title: "Capa", selected: false, kind: "cover", preview: "", characters: 0 },
    { href: "first.xhtml", title: "Primeiro", selected: true, kind: "content", preview: "Conteúdo primeiro", characters: 42 },
    { href: "second.xhtml", title: "Segundo", selected: true, kind: "content", preview: "Conteúdo segundo", characters: 43 },
  ] }, clean_report: {},
};
const preview: ExtractionPreview = {
  group: 1, source: "original", source_sha256: "original-hash", group_state: "project-hash",
  existing_text_count: 0, existing_primary_count: 0, requires_confirmation: false, warnings: [],
  sections: [
    { href: "first.xhtml", title: "Primeiro", position: 0, markdown: "# Primeiro\n\nTexto para revisar" },
    { href: "second.xhtml", title: "Segundo", position: 1, markdown: "# Segundo\n\nOutro texto" },
  ],
};
function Harness({ initialJobs = [job] }: { initialJobs?: EpubImportJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  return <ProjectEpubs groupId={1} groups={[group]} projectId={1} jobs={jobs}
    onJob={(value) => setJobs((current) => [value, ...current.filter((item) => item.id !== value.id)])}
    onExtracted={mocks.extracted} onBusy={mocks.busy} />;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockReset();
  mocks.extracted.mockResolvedValue(undefined);
  mocks.copy.mockResolvedValue(undefined);
});

it("uploads an original without requiring cleaning and keeps the file chooser reusable", async () => {
  const user = userEvent.setup();
  mocks.request.mockResolvedValue(job);
  render(<Harness initialJobs={[]} />);
  const input = screen.getByLabelText("Arquivo EPUB");
  const file = new File(["epub"], "fonte.epub", { type: "application/epub+zip" });
  await user.upload(input, file);
  await screen.findByRole("button", { name: "Extrair do original" });
  expect(mocks.request).toHaveBeenCalledWith("projects/1/imports", "POST", expect.any(FormData));
  expect((mocks.request.mock.calls[0][2] as FormData).get("file")).toBe(file);
  expect(input).toHaveValue("");
  expect(screen.queryByRole("button", { name: "Extrair do limpo" })).not.toBeInTheDocument();
  expect(mocks.extracted).not.toHaveBeenCalled();
  expect(mocks.request).toHaveBeenCalledTimes(1);
});

it("reviews original sections before cleaning and preserves the last successful download", async () => {
  const user = userEvent.setup();
  const clean = { ...job, clean_url: "/clean", clean_filename: "fonte_clean_v1.epub", clean_generation: 1 };
  mocks.request.mockResolvedValue(clean);
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Limpar EPUB" }));
  const dialog = screen.getByRole("dialog", { name: "Preparar cópia limpa" });
  expect(within(dialog).getByRole("checkbox", { name: "Manter Capa" })).not.toBeChecked();
  await user.click(within(dialog).getByRole("checkbox", { name: "Manter Segundo" }));
  await user.click(within(dialog).getByRole("checkbox", { name: "Manter Primeiro" }));
  expect(within(dialog).getByRole("button", { name: "Gerar cópia limpa" })).toBeDisabled();
  await user.click(within(dialog).getByRole("checkbox", { name: "Manter Primeiro" }));
  await user.click(within(dialog).getByRole("button", { name: "Gerar cópia limpa" }));
  await screen.findByRole("link", { name: "Baixar limpo" });
  expect(mocks.request).toHaveBeenCalledWith("epub-imports/job-1/clean", "POST", { sections: ["first.xhtml"] });
  expect(screen.getByRole("link", { name: "Baixar original" })).toHaveAttribute("href", job.original_url);
  expect(screen.getByRole("button", { name: "Extrair do limpo" })).toBeEnabled();
});

it("previews the original and requires a choice and confirmation before replacing existing texts", async () => {
  const user = userEvent.setup();
  const existing = { ...preview, requires_confirmation: true, existing_text_count: 3, existing_primary_count: 2 };
  mocks.request.mockImplementation((path: string) => path.includes("preview?") ? Promise.resolve(existing) : Promise.resolve({ group: 1, text_ids: [4, 5], reused: false }));
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Extrair do original" }));
  const dialog = await screen.findByRole("dialog", { name: "Extrair textos do original" });
  await within(dialog).findByText(/Este grupo já tem 3 textos/);
  const button = within(dialog).getByRole("button", { name: "Extrair textos" });
  expect(button).toBeDisabled();
  await user.click(within(dialog).getByRole("button", { name: "Segundo" }));
  expect(within(dialog).getByRole("article")).toHaveTextContent("Outro texto");
  await user.click(within(dialog).getByRole("radio", { name: "Substituir todos os textos e suas variações" }));
  const replace = within(dialog).getByRole("button", { name: "Substituir e extrair textos" });
  expect(replace).toBeEnabled();
  await user.click(replace);
  await waitFor(() => expect(mocks.extracted).toHaveBeenCalledOnce());
  expect(mocks.request).toHaveBeenCalledWith("epub-imports/job-1/extract", "POST", {
    group: 1, source: "original", source_sha256: "original-hash", group_state: "project-hash", mode: "replace", confirm_existing: true,
  });
});

it("invalidates confirmation on conflict and sends the cleaned source after reviewing again", async () => {
  const user = userEvent.setup();
  const clean = { ...job, clean_url: "/clean", clean_filename: "clean.epub", clean_sha256: "clean-hash" };
  let revision = 0;
  mocks.request.mockImplementation((path: string) => path.includes("preview?")
    ? Promise.resolve({ ...preview, source: "cleaned", source_sha256: "clean-hash", group_state: `state-${++revision}`, requires_confirmation: true, existing_text_count: 1, existing_primary_count: 1 })
    : Promise.reject(new ApiError("O projeto mudou", 409)));
  render(<Harness initialJobs={[clean]} />);
  await user.click(screen.getByRole("button", { name: "Extrair do limpo" }));
  const dialog = screen.getByRole("dialog", { name: "Extrair textos do EPUB limpo" });
  await user.click(await within(dialog).findByRole("radio", { name: "Acrescentar ao final, mantendo os textos existentes" }));
  await user.click(await within(dialog).findByRole("button", { name: "Extrair textos" }));
  await within(dialog).findByText("O projeto mudou");
  expect(within(dialog).getByRole("button", { name: "Extrair textos" })).toBeDisabled();
  await user.click(within(dialog).getByRole("button", { name: "Atualizar prévia" }));
  await waitFor(() => expect(within(dialog).getByRole("radio", { name: "Acrescentar ao final, mantendo os textos existentes" })).not.toBeChecked());
  expect(within(dialog).getByRole("button", { name: "Extrair textos" })).toBeDisabled();
  expect(mocks.request).toHaveBeenCalledWith("epub-imports/job-1/preview?source=cleaned&group=1");
  expect(mocks.request.mock.calls.find((call) => call[0].endsWith("/extract"))?.[2].source).toBe("cleaned");
});

it("keeps processing dialogs open, blocks repeated extraction and discards late responses after unmount", async () => {
  const user = userEvent.setup();
  let complete!: (result: unknown) => void;
  mocks.request.mockImplementation((path: string) => path.includes("preview?") ? Promise.resolve(preview) : new Promise((resolve) => { complete = resolve; }));
  const view = render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Extrair do original" }));
  const dialog = screen.getByRole("dialog");
  await user.click(await within(dialog).findByRole("button", { name: "Extrair textos" }));
  expect(within(dialog).getByRole("button", { name: "Extraindo textos…" })).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(dialog).toBeVisible();
  expect(mocks.busy).toHaveBeenLastCalledWith(true);
  view.unmount();
  await act(async () => { complete({ group: 1, text_ids: [1, 2], reused: false }); });
  expect(mocks.extracted).not.toHaveBeenCalled();
  expect(mocks.request.mock.calls.filter((call) => call[0].endsWith("/extract"))).toHaveLength(1);
});

it("shows a persisted error as a short message and copies its technical report", async () => {
  const user = userEvent.setup();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: mocks.copy } });
  const diagnostic = { id: "failure-1", operation: "clean", source: "original", code: "invalid_epub", message: "Uma imagem não foi encontrada.", copy_text: "Limpeza falhou\nimage/path\nlibrary/epub_import/cleaning.py:45" };
  render(<Harness initialJobs={[{ ...job, status: "error", error_diagnostic: diagnostic }]} />);
  expect(screen.getByRole("alert")).toHaveTextContent(diagnostic.message);
  expect(screen.getByRole("alert")).not.toHaveTextContent("cleaning.py");
  await user.click(screen.getByRole("button", { name: "Copiar relatório" }));
  expect(mocks.copy).toHaveBeenCalledWith(diagnostic.copy_text);
  await screen.findByText("Relatório copiado");
});

it("does not repeat extraction when refreshing a successful result fails", async () => {
  const user = userEvent.setup();
  mocks.extracted.mockRejectedValue(new Error("offline"));
  mocks.request.mockImplementation((path: string) => Promise.resolve(path.includes("preview?") ? preview : { group: 1, text_ids: [4, 5], reused: false }));
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Extrair do original" }));
  await user.click(await screen.findByRole("button", { name: "Extrair textos" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Os textos foram extraídos, mas a atualização da tela falhou"));
  expect(await screen.findByRole("status")).toHaveTextContent("2 textos extraídos");
  expect(mocks.request.mock.calls.filter((call) => call[0].endsWith("/extract"))).toHaveLength(1);
});

it("selects the correct imported file when a project has several sources", async () => {
  const user = userEvent.setup();
  const second = { ...job, id: "job-2", original_name: "outro.epub" };
  mocks.request.mockResolvedValue(preview);
  render(<Harness initialJobs={[job, second]} />);
  await user.click(screen.getByRole("combobox", { name: "EPUB de origem" }));
  await user.click(await screen.findByRole("option", { name: "outro.epub" }));
  await user.click(screen.getByRole("button", { name: "Extrair do original" }));
  expect(mocks.request).toHaveBeenCalledWith("epub-imports/job-2/preview?source=original&group=1");
});

it("makes the technical text selectable when clipboard copying is unavailable", async () => {
  const user = userEvent.setup();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: mocks.copy } });
  mocks.copy.mockRejectedValue(new Error("Permission denied"));
  const diagnostic = { id: "report", operation: "clean", source: "original", code: "invalid_epub", message: "Falha conhecida", copy_text: "Relatório técnico completo para copiar manualmente." };
  render(<Harness initialJobs={[{ ...job, error_diagnostic: diagnostic }]} />);
  await user.click(screen.getByRole("button", { name: "Copiar relatório" }));
  await screen.findByText("Selecione os detalhes abaixo e copie manualmente.");
  expect(screen.getByText(diagnostic.copy_text)).toBeVisible();
});


it("opens original and cleaned source reading without extracting or cleaning", async () => {
  const user = userEvent.setup();
  const read = vi.fn();
  const clean = {...job, clean_url: "/clean", clean_filename: "fonte_clean.epub"};
  mocks.request.mockResolvedValue(preview);
  render(<ProjectEpubs projectId={1} groupId={1} groups={[group]} jobs={[clean]} onRead={read} onJob={vi.fn()} onExtracted={mocks.extracted} onBusy={mocks.busy}/>);
  await user.click(screen.getByRole("button", {name: "fonte.epub"}));
  await waitFor(() => expect(read).toHaveBeenCalledWith({name: "fonte.epub", markdown: preview.sections.map(section => section.markdown).join("\n\n")}));
  await user.click(screen.getByRole("button", {name: "fonte_clean.epub"}));
  await waitFor(() => expect(read).toHaveBeenLastCalledWith(expect.objectContaining({name: "fonte_clean.epub"})));
  expect(mocks.request).toHaveBeenCalledWith("epub-imports/job-1/preview?source=original&group=1");
  expect(mocks.request).toHaveBeenCalledWith("epub-imports/job-1/preview?source=cleaned&group=1");
  expect(mocks.request.mock.calls.some(([, method]) => method && method !== "GET")).toBe(false);
  expect(mocks.extracted).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
