import { group } from "./group-fixture";
import { useState } from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { render } from "./render";
import { ApiError } from "@/api/client";
import type { SourceFile } from "@/features/library/source-types";
import type { ExtractionPreview } from "@/features/library/import-types";
const mocks = vi.hoisted(() => ({ request: vi.fn(), busy: vi.fn(), extracted: vi.fn(), job: vi.fn(), select: vi.fn() }));
vi.mock("@/features/library/api", () => ({ libraryRequest: mocks.request, errorMessage: (error: Error) => error.message }));
import { ProjectMarkdown } from "@/features/library/ProjectMarkdown";
import { LocalEpubs } from "@/features/library/LocalEpubs";
import { AppShell, useShell } from "@/components/shell/AppShell";
import { ProjectReading, type ReadingDocument } from "@/features/library/ProjectReading";
const files: SourceFile[] = [
    { name: "01-ato.md", sha256: "first", size: 45, status: "new" },
    { name: "02-ato.md", sha256: "second", size: 42, status: "imported" },
];
const preview: ExtractionPreview = {
    group: 1, source: "markdown", source_sha256: "source-hash", group_state: "project-hash",
    existing_text_count: 0, existing_primary_count: 0, requires_confirmation: false, warnings: [],
    sections: files.map((file, position) => ({ href: file.name, title: file.name, position, markdown: `# Ato ${position + 1}\n\nConteúdo para revisar` })),
};
function defaults(path: string, method?: string) {
    if (path.includes("markdown-files"))
        return Promise.resolve(files);
    if (path.endsWith("markdown-preview"))
        return Promise.resolve(preview);
    if (path.endsWith("markdown-import"))
        return Promise.resolve({ group: 1, text_ids: [7, 8], reused: false });
    if (method === "POST")
        return Promise.resolve({ id: "job-1" });
    return Promise.resolve([]);
}
function PanelControl() {
    const { rightOpen, toggleRight } = useShell();
    return <button onClick={toggleRight}>{rightOpen ? "Recolher leitura" : "Mostrar leitura"}</button>;
}
function Harness({ active = true }: { active?: boolean }) {
    const [busy, setBusy] = useState(false);
    const [reading, setReading] = useState<ReadingDocument | null>(null);
    return <AppShell header={<PanelControl />} right={null}>
        <ProjectMarkdown groupId={1} groups={[group]} projectId={1} onRead={setReading} blocked={busy} onBusy={setBusy} onExtracted={mocks.extracted}/>
        <ProjectReading document={active ? reading : null}/>
    </AppShell>;
}
beforeEach(() => { vi.clearAllMocks(); mocks.request.mockReset().mockImplementation(defaults); mocks.extracted.mockResolvedValue(undefined); });
it("imports Markdown into a named new group without replacing the current group", async () => {
    const user = userEvent.setup();
    mocks.request.mockImplementation((path, method, body) => path.endsWith("markdown-preview")
        ? Promise.resolve(body.group ? {...preview, existing_text_count: 2, requires_confirmation: true} : {...preview, group: null, group_state: "empty"})
        : defaults(path, method));
    render(<Harness />);
    await user.click(await screen.findByRole("button", {name: "Gerar todos"}));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", {name: "Destino dos textos"}));
    await user.click(await screen.findByRole("option", {name: "Novo grupo"}));
    await waitFor(() => expect(within(dialog).queryByRole("radiogroup")).not.toBeInTheDocument());
    expect(within(dialog).getByRole("button", {name: "Gerar textos"})).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/Nome do novo grupo/), "Revisados");
    await user.click(within(dialog).getByRole("button", {name: "Gerar textos"}));
    await waitFor(() => expect(mocks.extracted).toHaveBeenCalledWith(1));
    const payload = mocks.request.mock.calls.find(([path]) => path.endsWith("markdown-import"))![2];
    expect(payload).toMatchObject({new_group_name: "Revisados", group_state: "empty", mode: "append", confirm_existing: false});
    expect(payload.operation_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload).not.toHaveProperty("group");
});
it("opens manual Markdown and offers private downloads without creating Texts", async () => {
    render(<Harness />);
    expect(await screen.findByText("01-ato.md")).toBeVisible();
    expect(screen.getByText("Textos já gerados")).toBeVisible();
    expect(screen.getByRole("link", {name: "Baixar 01-ato.md"})).toHaveAttribute("href", "/api/library/projects/1/markdown-file?name=01-ato.md");
    await userEvent.setup().click(screen.getByRole("button", { name: "01-ato.md" }));
    const reading = await screen.findByRole("article", { name: "Leitura de 01-ato.md" });
    expect(within(reading).getByRole("heading", { name: "Ato 1" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Gerar todos" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.extracted).not.toHaveBeenCalled();
});
it("switches the lateral reading and hides it outside the Markdown tab", async () => {
    mocks.request.mockImplementation((path, method, body) => path.endsWith("markdown-preview")
        ? Promise.resolve({ ...preview, sections: preview.sections.filter((item) => body.files.includes(item.href)) })
        : defaults(path, method));
    const user = userEvent.setup();
    const { rerender } = render(<Harness />);
    await user.click(await screen.findByRole("button", { name: "01-ato.md" }));
    await screen.findByRole("article", { name: "Leitura de 01-ato.md" });
    await user.click(screen.getByRole("button", { name: "02-ato.md" }));
    const reading = await screen.findByRole("article", { name: "Leitura de 02-ato.md" });
    expect(within(reading).getByRole("heading", { name: "Ato 2" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "Leitura de 01-ato.md" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Recolher leitura" }));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar leitura" }));
    expect(screen.getByRole("article", { name: "Leitura de 02-ato.md" })).toBeVisible();
    rerender(<Harness active={false}/>);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar leitura" })).toBeVisible();
    rerender(<Harness />);
    expect(await screen.findByRole("article", { name: "Leitura de 02-ato.md" })).toBeVisible();
    expect(mocks.request.mock.calls.some(([path]) => path.endsWith("markdown-import"))).toBe(false);
});
it("uploads a dropped batch and refreshes without automatically generating Texts", async () => {
    render(<Harness />);
    await screen.findByText("01-ato.md");
    const incoming = [new File(["# A"], "a.md"), new File(["# B"], "b.md")];
    fireEvent.drop(screen.getByRole("group", {name: "Área de upload Markdown"}), { dataTransfer: { files: incoming } });
    await screen.findByText("Arquivos enviados.");
    const call = mocks.request.mock.calls.find(([path, method]) => path.includes("markdown-files") && method === "POST")!;
    expect((call[2] as FormData).getAll("files")).toEqual(incoming);
    expect(mocks.extracted).not.toHaveBeenCalled();
});
it("reviews a selected batch and requires explicit confirmation when Texts exist", async () => {
    mocks.request.mockImplementation((path, method) => path.endsWith("markdown-preview") ? Promise.resolve({ ...preview, existing_text_count: 2, existing_primary_count: 1, requires_confirmation: true }) : defaults(path, method));
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByText("01-ato.md");
    await user.click(screen.getByRole("checkbox", { name: "Selecionar 01-ato.md" }));
    expect(screen.getByRole("button", { name: "Gerar selecionados" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Gerar selecionados" }));
    expect(mocks.request).toHaveBeenCalledWith("projects/1/markdown-preview", "POST", { files: ["01-ato.md"], group: 1 });
    const dialog = await screen.findByRole("dialog", { name: "Gerar textos dos Markdown" });
    await within(dialog).findByText(/Este grupo já tem 2 textos/);
    expect(within(dialog).getByRole("button", { name: "Gerar textos" })).toBeDisabled();
    expect(within(dialog).queryByRole("button", { name: "Atualizar prévia" })).not.toBeInTheDocument();
    const generate = within(dialog).getByRole("button", { name: "Gerar textos" });
    expect(generate.closest(".MuiDialogActions-root")).not.toBeNull();
    expect(generate.closest(".MuiDialogContent-root")).toBeNull();
    await user.click(within(dialog).getByRole("radio", { name: "Acrescentar ao final, mantendo os textos existentes" }));
    expect(generate).toBeEnabled();
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Gerar textos" }));
    await screen.findByText("Textos disponíveis no projeto.");
    expect(mocks.request).toHaveBeenCalledWith("projects/1/markdown-import", "POST", expect.objectContaining({ source_sha256: "source-hash", group_state: "project-hash", mode: "append", confirm_existing: true }));
    expect(mocks.extracted).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("checkbox", {name: "Selecionar 01-ato.md"}));
    await user.click(await screen.findByRole("button", { name: "Gerar todos" }));
    expect(mocks.request).toHaveBeenCalledWith("projects/1/markdown-preview", "POST", { files: ["01-ato.md", "02-ato.md"], group: 1 });
});
it("blocks stale generation and reloads the same individual source", async () => {
    const user = userEvent.setup();
    mocks.request.mockImplementation((path, method) => path.endsWith("markdown-import") ? Promise.reject(new ApiError("Fonte mudou", 409)) : defaults(path, method));
    render(<Harness />);
    await screen.findByText("01-ato.md");
    await user.click(screen.getByRole("button", { name: "Gerar texto de 01-ato.md" }));
    const dialog = await screen.findByRole("dialog", { name: "Gerar textos dos Markdown" });
    await user.click(await within(dialog).findByRole("button", { name: "Gerar textos" }));
    await within(dialog).findByText("Fonte mudou");
    expect(within(dialog).getByRole("button", { name: "Gerar textos" })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Atualizar prévia" }));
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Gerar textos" })).toBeEnabled());
    expect(mocks.request.mock.calls.filter(([path]) => path.endsWith("markdown-preview"))).toEqual([
        ["projects/1/markdown-preview", "POST", { files: ["01-ato.md"], group: 1 }], ["projects/1/markdown-preview", "POST", { files: ["01-ato.md"], group: 1 }],
    ]);
});
it.each([
    ["append", "Acrescentar ao final, mantendo os textos existentes"],
    ["replace", "Substituir todos os textos e suas variações"],
])("generates all Markdown with only the %s choice and the final action", async (mode, label) => {
    mocks.request.mockImplementation((path, method) => path.endsWith("markdown-preview")
        ? Promise.resolve({ ...preview, existing_text_count: 1, existing_primary_count: 1, requires_confirmation: true })
        : defaults(path, method));
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByText("01-ato.md");
    await user.click(screen.getByRole("button", { name: "Gerar todos" }));
    const dialog = await screen.findByRole("dialog", { name: "Gerar textos dos Markdown" });
    await user.click(await within(dialog).findByRole("radio", { name: label }));
    expect(within(dialog).queryByRole("button", { name: "Atualizar prévia" })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Gerar textos" }));
    await screen.findByText("Textos disponíveis no projeto.");
    expect(mocks.request).toHaveBeenCalledWith("projects/1/markdown-import", "POST", {
        files: ["01-ato.md", "02-ato.md"], group: 1, source_sha256: "source-hash", group_state: "project-hash", mode, confirm_existing: true,
    });
    expect(mocks.extracted).toHaveBeenCalledOnce();
});
it("offers retry only after the initial preview fails, then enables generation", async () => {
    let attempts = 0;
    mocks.request.mockImplementation((path, method) => path.endsWith("markdown-preview") && attempts++ === 0
        ? Promise.reject(new Error("Não foi possível consultar os arquivos.")) : defaults(path, method));
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByText("01-ato.md");
    await user.click(screen.getByRole("button", { name: "Gerar todos" }));
    const dialog = await screen.findByRole("dialog", { name: "Gerar textos dos Markdown" });
    await within(dialog).findByText("Não foi possível consultar os arquivos.");
    expect(within(dialog).getByRole("button", { name: "Gerar textos" })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Atualizar prévia" }));
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Gerar textos" })).toBeEnabled());
    expect(within(dialog).queryByRole("button", { name: "Atualizar prévia" })).not.toBeInTheDocument();
    expect(mocks.extracted).not.toHaveBeenCalled();
});
it("rejects invalid drops and prevents escape closing an in-flight generation", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByText("01-ato.md");
    fireEvent.drop(screen.getByRole("group", {name: "Área de upload Markdown"}), { dataTransfer: { files: [new File(["bad"], "wrong.txt")] } });
    await screen.findByText(/Envie até 100 arquivos/);
    let complete!: (value: unknown) => void;
    mocks.request.mockImplementation((path, method) => path.endsWith("markdown-import") ? new Promise((resolve) => { complete = resolve; }) : defaults(path, method));
    await user.click(screen.getByRole("button", { name: "Gerar todos" }));
    const dialog = await screen.findByRole("dialog", { name: "Gerar textos dos Markdown" });
    await user.click(await within(dialog).findByRole("button", { name: "Gerar textos" }));
    await user.keyboard("{Escape}");
    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Gerando textos…" })).toBeDisabled();
    await act(async () => complete({ group: 1, text_ids: [7, 8], reused: false }));
    await screen.findByText("Textos disponíveis no projeto.");
});
it("explicitly links local EPUBs without uploading or extracting", async () => {
    let entries: SourceFile[] = [{ name: "original.epub", size: 123, sha256: "digest", status: "unregistered" }];
    mocks.request.mockImplementation((path, method) => {
        if (path.endsWith("local-epubs"))
            return Promise.resolve(entries);
        if (method === "POST") {
            entries = [{ ...entries[0], status: "registered", job: "job-1" }];
            return Promise.resolve({ id: "job-1" });
        }
        return defaults(path, method);
    });
    render(<LocalEpubs projectId={1} blocked={false} onJob={mocks.job} onBusy={mocks.busy} onSelect={mocks.select}/>);
    await screen.findByText("Na pasta · disponível para vincular");
    await userEvent.setup().click(screen.getByRole("button", { name: "Vincular" }));
    await screen.findByText("Vinculado");
    expect(mocks.request).toHaveBeenCalledWith("projects/1/link-epub", "POST", { name: "original.epub", sha256: "digest" });
    expect(mocks.job).toHaveBeenCalledWith({ id: "job-1" });
    expect(mocks.select).toHaveBeenCalledWith("job-1");
    expect(mocks.extracted).not.toHaveBeenCalled();
});
