import { render } from "./render";
import { screen } from "@testing-library/react";
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
  filename: "livro.epub",
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
