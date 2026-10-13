import { render } from "./render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/features/library/api", () => ({
  libraryRequest: request,
  errorMessage: (error: Error) => error.message,
}));
import { ProjectCover } from "@/features/library/ProjectCover";
import type { Project } from "@/features/library/types";

const project: Project = {
  id: 1,
  slug: "livro",
  title: "Livro",
  subtitle: "",
  author: "",
  collection: null,
  default_group: 1,
  is_inbox: false,
  text_count: 0,
  updated_at: "",
};
beforeEach(() => {
  request.mockReset();
});

it("uploads the selected cover as multipart and updates the project", async () => {
  const updated = {
    ...project,
    cover: "image-id",
    cover_url: "/api/library/assets/image-id/file",
  };
  request.mockResolvedValue(updated);
  const onChange = vi.fn();
  render(<ProjectCover project={project} onChange={onChange} />);
  const image = new File(["image bytes"], "capa.png", { type: "image/png" });
  await userEvent
    .setup()
    .upload(screen.getByLabelText("Arquivo de capa"), image);
  const [path, method, body] = request.mock.calls[0];
  expect(path).toBe("projects/1/cover");
  expect(method).toBe("POST");
  expect(body).toBeInstanceOf(FormData);
  expect(body.get("image")).toBe(image);
  expect(onChange).toHaveBeenCalledWith(updated);
});

it("keeps the current cover when uploading fails and allows retry", async () => {
  request.mockRejectedValue(new Error("Não foi possível enviar"));
  const onChange = vi.fn();
  render(
    <ProjectCover
      project={{ ...project, cover_url: "/api/library/assets/old/file" }}
      onChange={onChange}
    />,
  );
  const image = new File(["image bytes"], "capa.png", { type: "image/png" });
  await userEvent
    .setup()
    .upload(screen.getByLabelText("Arquivo de capa"), image);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível enviar",
  );
  expect(screen.getByRole("img", { name: "Capa de Livro" })).toHaveAttribute(
    "src",
    "/api/library/assets/old/file",
  );
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Trocar capa" })).toBeEnabled();
});
