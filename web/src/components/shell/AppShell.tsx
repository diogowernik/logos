"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
type RightContext = { key: string; defaultOpen: boolean };
type ShellState = {
  leftOpen: boolean;
  rightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  setRightOpen: (open: boolean) => void;
  rightHost: HTMLDivElement | null;
  setRightContext: (context: RightContext | null) => void;
  hasLeft: boolean;
  hasRight: boolean;
  rightLabel: string;
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
  const [rightOverrides, setRightOverrides] = useState<Record<string, boolean>>({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = JSON.parse(localStorage.getItem("logos.shell.panels") || "{}");
        const savedLeft = typeof saved?.left === "boolean" ? saved.left : null;
        const savedRight = saved?.right && typeof saved.right === "object" && !Array.isArray(saved.right)
          ? Object.fromEntries(Object.entries(saved.right).filter(([, value]) => typeof value === "boolean")) as Record<string, boolean>
          : {};
        setLeft((current) => current ?? savedLeft);
        setRightOverrides((current) => ({ ...savedRight, ...current }));
      } catch { /* Local preferences never block the workspace. */ }
      setPreferencesLoaded(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      localStorage.setItem("logos.shell.panels", JSON.stringify({ left: leftOverride, right: rightOverrides }));
    } catch { /* Storage-disabled browsers still allow panel controls. */ }
  }, [leftOverride, rightOverrides, preferencesLoaded]);
  const [rightContext, setRightContext] = useState<RightContext | null>(null);
  const rightKey = rightContext?.key ?? "default";
  const [rightHost, setHost] = useState<HTMLDivElement | null>(null);
  const rightOpen = right !== undefined && (rightOverrides[rightKey] ?? rightContext?.defaultOpen ?? wide);
  const leftOpen =
    Boolean(left) && (leftOverride ?? desktop) && (desktop || !rightOpen);
  const attachHost = useCallback(
    (node: HTMLDivElement | null) => setHost(node),
    [],
  );
  const setRightOpen = useCallback(
    (open: boolean) => {
      setRightOverrides((current) => ({ ...current, [rightKey]: open }));
      if (!desktop && open) setLeft(false);
    },
    [desktop, rightKey],
  );
  const state = {
    leftOpen,
    rightOpen,
    toggleLeft: () => {
      setLeft(!leftOpen);
      if (!desktop && !leftOpen) setRightOpen(false);
    },
    toggleRight: () => setRightOpen(!rightOpen),
    setRightOpen,
    rightHost,
    setRightContext,
    hasLeft: Boolean(left),
    hasRight: right !== undefined,
    rightLabel,
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
        onClose={() => (side === "left" ? setLeft(false) : setRightOpen(false))}
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
            onClick={() => (side === "left" ? setLeft(false) : setRightOpen(false))}
          >
            Fechar{" "}
            {side === "left"
              ? "navegação"
              : rightLabel.toLocaleLowerCase("pt-BR")}
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
