"use client";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
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
  const theme = useTheme();
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
    width: number,
    label: string,
  ) {
    const docked = desktop && (side === "left" || rightDocked);
    return (
      <Drawer
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
            sx: {
              position: docked ? "relative" : "fixed",
              top: docked ? 0 : { xs: 56, sm: 64 },
              width,
              maxWidth: "calc(100vw - 48px)",
              height: docked
                ? "100%"
                : { xs: "calc(100% - 56px)", sm: "calc(100% - 64px)" },
              bgcolor:
                side === "left"
                  ? theme.app.surfaces.sidebar
                  : theme.app.surfaces.reading,
              boxShadow: "none",
              display: docked && !open ? "none" : undefined,
            },
          },
        }}
        sx={{
          width: docked && open ? width : 0,
          flexShrink: 0,
          overflow: "hidden",
          height: "100%",
        }}
      >
        {!docked && (
          <Button
            variant="text"
            onClick={() => (side === "left" ? setLeft(false) : setRight(false))}
            sx={{ alignSelf: "flex-end", m: 1 }}
          >
            Fechar {side === "left" ? "navegação" : "preview"}
          </Button>
        )}
        {side === "left" ? (
          content
        ) : (
          <Box id="text-preview" sx={{ p: 2, overflowWrap: "anywhere" }}>
            {content}
            <div ref={attachHost} />
          </Box>
        )}
      </Drawer>
    );
  }
  return (
    <ShellContext.Provider value={state}>
      <Box
        sx={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {header}
        <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
          {left && (
            <Box
              sx={{ display: "contents" }}
              onClick={(event) => {
                if (
                  !desktop &&
                  !event.defaultPrevented &&
                  (event.target as HTMLElement).closest("a[href]")
                )
                  setLeft(false);
              }}
            >
              {panel(
                "left",
                left,
                leftOpen,
                theme.app.layout.leftWidth,
                leftLabel,
              )}
            </Box>
          )}
          <Box
            component="main"
            sx={{
              flex: 1,
              minWidth: 0,
              overflowY: "auto",
              p: { xs: 1.5, md: 2.5 },
            }}
          >
            {children}
          </Box>
          {right !== undefined &&
            panel(
              "right",
              right,
              rightOpen,
              theme.app.layout.rightWidth,
              rightLabel,
            )}
        </Box>
      </Box>
    </ShellContext.Provider>
  );
}
