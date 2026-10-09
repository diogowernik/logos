import { expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "./render";
import { Markdown } from "@/components/Markdown";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/shell/AppShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/3",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

it("hides EPUB import anchors in reading without changing the source", () => {
  const markdown = '# Abertura\n\n<a id="epub-cb077c1dc8efacaf409fd87a"></a>\n\nTexto do livro.';
  render(<Markdown content={markdown}/>);
  expect(screen.getByRole("heading", { name: "Abertura" })).toBeVisible();
  expect(screen.getByText("Texto do livro.")).toBeVisible();
  expect(screen.queryByText(/<a id=/)).not.toBeInTheDocument();
  expect(markdown).toContain('<a id="epub-');
});

it("keeps the right panel control in the project header after closing and reopening", async () => {
  localStorage.removeItem("logos.shell.panels");
  render(<AppShell header={<AppHeader/>} right={null} rightLabel="Painel de trabalho">Projeto</AppShell>);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Ocultar painel de trabalho" }));
  expect(screen.getByRole("button", { name: "Mostrar painel de trabalho" })).toHaveAttribute("aria-expanded", "false");
  await user.click(screen.getByRole("button", { name: "Mostrar painel de trabalho" }));
  expect(screen.getByRole("button", { name: "Ocultar painel de trabalho" })).toHaveAttribute("aria-expanded", "true");
});
