"use client";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  WorkspaceRoot,
  WorkspaceColumns,
  NavigationBoundary,
  WorkspaceMain,
  WorkspaceDrawer,
  PanelCloseButton,
  PreviewPanel,
} from "@/theme/workspace";
type ShellState = {
  leftOpen: boolean;
  rightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  setRightOpen: (open: boolean) => void;
  rightHost: HTMLDivElement | null;
  hasLeft: boolean;
  hasRight: boolean;
};
const ShellContext = createContext<ShellState | null>(null);
export function useShell() {
  const state = useContext(ShellContext);
  if (!state) throw new Error("AppShell ausente.");
  return state;
}
export function AppShell({
  children,
  header,
  left,
  right,
  leftLabel = "Navegação",
  rightLabel = "Preview",
}: {
  children: ReactNode;
  header: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
}) {
  const desktop = useMediaQuery("(min-width: 761px)");
  const rightDocked = useMediaQuery("(min-width: 1100px)");
  const wide = useMediaQuery("(min-width: 1280px)");
  const [leftOverride, setLeft] = useState<boolean | null>(null);
  const [rightOverride, setRight] = useState<boolean | null>(null);
  const [rightHost, setHost] = useState<HTMLDivElement | null>(null);
  const rightOpen = right !== undefined && (rightOverride ?? wide);
  const leftOpen =
    Boolean(left) && (leftOverride ?? desktop) && (desktop || !rightOpen);
  const attachHost = useCallback(
    (node: HTMLDivElement | null) => setHost(node),
    [],
  );
  function setRightOpen(open: boolean) {
    setRight(open);
    if (!desktop && open) setLeft(false);
  }
  const state = {
    leftOpen,
    rightOpen,
    toggleLeft: () => {
      setLeft(!leftOpen);
      if (!desktop && !leftOpen) setRight(false);
    },
    toggleRight: () => setRightOpen(!rightOpen),
    setRightOpen,
    rightHost,
    hasLeft: Boolean(left),
    hasRight: right !== undefined,
  };
  function panel(
    side: "left" | "right",
    content: ReactNode,
    open: boolean,
    label: string,
  ) {
    const docked = desktop && (side === "left" || rightDocked);
    return (
      <WorkspaceDrawer
        panelSide={side}
        docked={docked}
        expanded={open}
        variant={docked ? "permanent" : "temporary"}
        anchor={side}
        open={open}
        onClose={() => (side === "left" ? setLeft(false) : setRight(false))}
        slotProps={{
          root: { keepMounted: true },
          paper: {
            component: "aside",
            id: side === "left" ? "app-left-panel" : "app-right-panel",
            "aria-label": label,
          },
        }}
      >
        {!docked && (
          <PanelCloseButton
            variant="text"
            onClick={() => (side === "left" ? setLeft(false) : setRight(false))}
          >
            Fechar {side === "left" ? "navegação" : "preview"}
          </PanelCloseButton>
        )}
        {side === "left" ? (
          content
        ) : (
          <PreviewPanel id="text-preview">
            {content}
            <div ref={attachHost} />
          </PreviewPanel>
        )}
      </WorkspaceDrawer>
    );
  }
  return (
    <ShellContext.Provider value={state}>
      <WorkspaceRoot>
        {header}
        <WorkspaceColumns>
          {left && (
            <NavigationBoundary
              onClick={(event) => {
                if (
                  !desktop &&
                  !event.defaultPrevented &&
                  (event.target as HTMLElement).closest("a[href]")
                )
                  setLeft(false);
              }}
            >
              {panel("left", left, leftOpen, leftLabel)}
            </NavigationBoundary>
          )}
          <WorkspaceMain component="main">{children}</WorkspaceMain>
          {right !== undefined && panel("right", right, rightOpen, rightLabel)}
        </WorkspaceColumns>
      </WorkspaceRoot>
    </ShellContext.Provider>
  );
}
