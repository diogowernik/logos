import { render } from "./render";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/features/library/api", () => ({
  libraryRequest: request,
  errorMessage: (error: Error) => error.message,
}));
import { ProjectExport } from "@/features/library/ProjectExport";
import type { EpubArtifact } from "@/features/library/types";

const artifact: EpubArtifact = {
  filename: "livro_v1.epub",
  generation: 1,
  url: "/api/library/projects/1/epub/file",
  created_at: "2026-10-06T12:00:00Z",
  sha256: "digest",
  compiler_version: "logos-epub-1",
};
beforeEach(() => {
  request.mockReset();
});

it("generates the EPUB and then offers its private download", async () => {
  request.mockResolvedValue(artifact);
  const onChange = vi.fn();
  const { rerender } = render(
    <ProjectExport
      projectId={1}
      artifact={null}
      hasContent
      onChange={onChange}
    />,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Gerar EPUB" }));
  expect(request).toHaveBeenCalledWith("projects/1/epub", "POST");
  expect(onChange).toHaveBeenCalledWith(artifact);
  rerender(
    <ProjectExport
      projectId={1}
      artifact={artifact}
      hasContent
      onChange={onChange}
    />,
  );
  expect(screen.getByRole("link", { name: "Baixar EPUB" })).toHaveAttribute(
    "href",
    artifact.url,
  );
  expect(screen.getByRole("link", { name: "Baixar EPUB" })).toHaveAttribute(
    "download",
    artifact.filename,
  );
});

it("retains the last download on a failed regeneration and permits retry", async () => {
  request.mockRejectedValue(new Error("Não foi possível gerar"));
  const onChange = vi.fn();
  render(
    <ProjectExport
      projectId={1}
      artifact={artifact}
      hasContent
      onChange={onChange}
    />,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Gerar novamente" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível gerar",
  );
  expect(screen.getByRole("link", { name: "Baixar EPUB" })).toHaveAttribute(
    "href",
    artifact.url,
  );
  expect(screen.getByRole("button", { name: "Gerar novamente" })).toBeEnabled();
  expect(onChange).not.toHaveBeenCalled();
});

it("confirms deletion and preserves the EPUB when cancelled", async () => {
  const onChange = vi.fn();
  render(
    <ProjectExport
      projectId={1}
      artifact={artifact}
      hasContent
      onChange={onChange}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Excluir EPUB" }));
  const dialog = screen.getByRole("dialog", { name: "Excluir EPUB gerado?" });
  expect(within(dialog).getByText(artifact.filename)).toBeVisible();
  expect(request).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("link", { name: "Baixar EPUB" })).toBeVisible();
  expect(request).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
});

it("deletes only after confirmation and updates the empty export state", async () => {
  let complete!: () => void;
  request.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const onChange = vi.fn();
  const view = render(
    <ProjectExport
      projectId={1}
      artifact={artifact}
      hasContent
      onChange={onChange}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Excluir EPUB" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Excluir EPUB",
    }),
  );
  expect(screen.getByRole("button", { name: "Excluindo…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(request).toHaveBeenCalledWith("projects/1/epub", "DELETE");
  await act(async () => complete());
  expect(onChange).toHaveBeenCalledWith(null);
  view.rerender(
    <ProjectExport
      projectId={1}
      artifact={null}
      hasContent
      onChange={onChange}
    />,
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("link", { name: "Baixar EPUB" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Nenhum EPUB gerado.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Gerar EPUB" })).toBeEnabled();
});

it("preserves the last artifact when deletion fails and allows retry", async () => {
  request
    .mockRejectedValueOnce(new Error("Falha ao excluir"))
    .mockResolvedValueOnce(undefined);
  const onChange = vi.fn();
  render(
    <ProjectExport
      projectId={1}
      artifact={artifact}
      hasContent
      onChange={onChange}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Excluir EPUB" }));
  const dialog = screen.getByRole("dialog");
  await user.click(
    within(dialog).getByRole("button", { name: "Excluir EPUB" }),
  );
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Falha ao excluir",
  );
  expect(onChange).not.toHaveBeenCalled();
  await user.click(
    within(dialog).getByRole("button", { name: "Excluir EPUB" }),
  );
  expect(onChange).toHaveBeenCalledWith(null);
});
