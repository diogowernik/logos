import { useState } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import Button from "@mui/material/Button";
import { AppShell, useShell } from "@/components/shell/AppShell";
import { render } from "./render";
let resize: (width: number) => void;
beforeEach(() => {
  let width = 1440;
  const subscriptions = new Set<() => void>();
  window.matchMedia = (query) =>
    ({
      get matches() {
        return width >= (Number(query.match(/min-width:\s*(\d+)/)?.[1]) || 0);
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => {
        subscriptions.add(listener);
      },
      removeEventListener: (_type: string, listener: () => void) => {
        subscriptions.delete(listener);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    }) as unknown as MediaQueryList;
  resize = (value) => {
    width = value;
    act(() => subscriptions.forEach((callback) => callback()));
  };
});
function Controls() {
  const shell = useShell();
  return (
    <header>
      <Button onClick={shell.toggleLeft} aria-expanded={shell.leftOpen}>
        Navegação
      </Button>
      <Button onClick={shell.toggleRight} aria-expanded={shell.rightOpen}>
        Preview
      </Button>
    </header>
  );
}
function Editor() {
  const [value, setValue] = useState("");
  return (
    <textarea
      aria-label="Rascunho"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
function Workspace() {
  return (
    <AppShell
      header={<Controls />}
      left={
        <a href="/outro" onClick={(e) => e.preventDefault()}>
          Navegação cancelada
        </a>
      }
      right={null}
    >
      <Editor />
    </AppShell>
  );
}
it("keeps the same editor and draft while panels collapse and the viewport changes", async () => {
  render(<Workspace />);
  const user = userEvent.setup();
  const editor = screen.getByLabelText("Rascunho");
  await user.type(editor, "Texto ainda não salvo");
  await user.click(screen.getByRole("button", { name: "Navegação" }));
  await user.click(screen.getByRole("button", { name: "Preview" }));
  expect(screen.getByLabelText("Rascunho")).toBe(editor);
  resize(390);
  await user.click(screen.getByRole("button", { name: "Preview" }));
  expect(
    await screen.findByRole("button", { name: "Fechar preview" }),
  ).toBeVisible();
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Fechar preview" }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByLabelText("Rascunho")).toBe(editor);
  expect(editor).toHaveValue("Texto ainda não salvo");
});
it("keeps mobile navigation open after a cancelled link and closes it with Escape", async () => {
  resize(390);
  render(<Workspace />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Navegação" }));
  await user.click(screen.getByRole("link", { name: "Navegação cancelada" }));
  expect(
    screen.getByRole("button", { name: "Fechar navegação" }),
  ).toBeVisible();
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Fechar navegação" }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("button", { name: "Navegação" })).toHaveFocus();
});
