import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import CardHeader from "@mui/material/CardHeader";
import CardActions from "@mui/material/CardActions";
import Drawer from "@mui/material/Drawer";
import InputBase from "@mui/material/InputBase";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";

const workspaceText = { fontSize: "1rem", fontWeight: 400 };

export const WorkspaceRoot = styled(Box)({
  height: "100dvh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});
export const WorkspaceColumns = styled(Box)({
  display: "flex",
  flex: 1,
  minHeight: 0,
});
export const NavigationBoundary = styled(Box)({ display: "contents" });
export const WorkspaceMain = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  overflowY: "auto",
  padding: theme.spacing(2.5, 3),
  [theme.breakpoints.down("md")]: { padding: theme.spacing(2) },
})) as typeof Box;
export const WorkspaceDrawer = styled(Drawer, {
  shouldForwardProp: (prop) =>
    !["panelSide", "docked", "expanded"].includes(String(prop)),
})<{ panelSide: "left" | "right"; docked: boolean; expanded: boolean }>(({
  theme,
  panelSide,
  docked,
  expanded,
}) => {
  const width =
    panelSide === "left"
      ? theme.app.layout.leftWidth
      : docked
        ? theme.app.layout.rightWidth
        : theme.app.layout.rightOverlayWidth;
  return {
    width: docked && expanded ? width : 0,
    flexShrink: 0,
    overflow: "hidden",
    height: "100%",
    "& .MuiDrawer-paper": {
      position: docked ? "relative" : "fixed",
      top: docked ? 0 : 56,
      width,
      maxWidth: "calc(100vw - 48px)",
      height: docked ? "100%" : "calc(100% - 56px)",
      backgroundColor:
        panelSide === "left"
          ? theme.app.surfaces.sidebar
          : theme.app.surfaces.reading,
      boxShadow: "none",
      display: docked && !expanded ? "none" : undefined,
      [theme.breakpoints.up("sm")]: {
        top: docked ? 0 : 64,
        height: docked ? "100%" : "calc(100% - 64px)",
      },
    },
  };
});
export const PanelCloseButton = styled(Button)(({ theme }) => ({
  alignSelf: "flex-end",
  margin: theme.spacing(1),
}));
export const PreviewPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  overflowWrap: "anywhere",
  [theme.breakpoints.down("sm")]: { padding: theme.spacing(2) },
}));
export const WorkspacePath = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  gap: theme.spacing(1),
}));
export const WorkspaceBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  flex: 1,
  overflowWrap: "anywhere",
  ...workspaceText,
  "& .MuiTypography-root": {
    fontSize: "inherit",
    color: theme.palette.text.primary,
  },
  "& a": { color: theme.palette.primary.main },
}));
export const EditorPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.app.surfaces.reading,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
})) as typeof Paper;
export const EditorWorkspace = styled(Stack, {
  shouldForwardProp: (prop) => prop !== "editing",
})<{ editing: boolean }>(({ editing }) => ({
  height: editing ? "100%" : undefined,
  minHeight: 0,
  "& > :not(.text-editor-paper)": { flexShrink: 0 },
}));
export const EditorHeader = styled(CardHeader)(({ theme }) => ({
  backgroundColor: theme.app.surfaces.reading,
  color: theme.palette.text.secondary,
  padding: theme.spacing(1.5, 3),
  minHeight: 60,
  flexShrink: 0,
  [theme.breakpoints.down("sm")]: { padding: theme.spacing(1, 2) },
})) as typeof CardHeader;
export const EditorTitle = styled(InputBase)(({ theme }) => ({
  width: "clamp(140px, 18vw, 240px)",
  maxWidth: "100%",
  minHeight: 36,
  padding: theme.spacing(0.5, 1),
  ...workspaceText,
  color: theme.palette.text.primary,
  border: "1px solid transparent",
  borderRadius: theme.shape.borderRadius,
  "&:hover, &.Mui-focused": { borderColor: theme.palette.divider },
}));
export const EditorBody = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  padding: theme.spacing(2, 4),
  [theme.breakpoints.down("sm")]: { padding: theme.spacing(2, 3) },
}));
export const MarkdownInput = styled(InputBase)(({ theme }) => ({
  padding: 0,
  alignItems: "flex-start",
  flex: 1,
  minHeight: 0,
  height: "100%",
  ...workspaceText,
  lineHeight: 1.75,
  fontFamily: theme.typography.fontFamily,
  "& textarea": {
    padding: 0,
    height: "100%",
    boxSizing: "border-box",
    overflowY: "auto",
    resize: "none",
  },
}));
export const EditorFooter = styled(CardActions)(({ theme }) => ({
  backgroundColor: theme.app.surfaces.reading,
  flexShrink: 0,
}));
export const EditorStatus = styled(Typography)(workspaceText);
export const EditorWordCount = styled(Typography)({
  ...workspaceText,
  marginRight: "auto",
});
export const PreviewDocument = styled(Box)(({ theme }) => ({
  maxWidth: "68ch",
  marginInline: "auto",
  fontFamily: theme.typography.fontFamily,
  color: theme.palette.text.primary,
  "& .markdown": { ...workspaceText, lineHeight: 1.75 },
  "& .markdown h1": { fontSize: "1.5rem" },
  "& .markdown h2": { fontSize: "1.375rem" },
  "& .markdown h3": { fontSize: "1.125rem" },
  "& .markdown p": { marginBlock: "1em" },
  "& .markdown > :last-child": { marginBottom: 0 },
})) as typeof Box;

export const SidebarRow = styled(Box, {
  shouldForwardProp: (prop) => !["active", "dropTarget"].includes(String(prop)),
})<{ active?: boolean; dropTarget?: boolean }>(
  ({ theme, active, dropTarget }) => ({
    display: "flex",
    alignItems: "center",
    position: "relative",
    borderRadius: theme.spacing(1),
    backgroundColor: dropTarget
      ? theme.palette.action.selected
      : active
        ? theme.palette.action.hover
        : undefined,
    "&:hover .sidebar-row-actions, &:focus-within .sidebar-row-actions": {
      opacity: 1,
    },
  }),
);
export const SidebarRowActions = styled(Box)(({ theme }) => ({
  position: "absolute",
  right: 0,
  display: "flex",
  opacity: 0,
  backgroundColor: theme.app.surfaces.sidebar,
  borderRadius: theme.spacing(1),
  "@media (hover: none)": { position: "static", opacity: 1 },
}));
