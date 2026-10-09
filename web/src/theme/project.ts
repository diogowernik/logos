import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

import { styled } from "@mui/material/styles";
import { ReadingButton } from "./workspace";

export const ProjectSummary = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));
export const ProjectFeedback = styled(Typography)(({ theme }) => ({
  fontSize: "0.875rem",
  color: theme.palette.text.secondary,
}));
export const ProjectPanelToolbar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: theme.spacing(1, 2),
  marginBottom: theme.spacing(1),
}));
export const ProjectFileInfo = styled(Box)({ flex: 1, minWidth: 0 });
export const ProjectFileName = styled(Typography)({ overflowWrap: "anywhere" });
export const ChapterRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 0),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));
export const ChapterDragHandle = styled(IconButton)({
  touchAction: "none",
  cursor: "grab",
});
export const ChapterReadButton = styled(ReadingButton)({
  flex: 1,
  minWidth: 0,
  overflowWrap: "anywhere",
});
export const ProjectCoverRoot = styled(Box)({
  width: 96,
  flexShrink: 0,
  maxWidth: "100%",
});
export const ProjectCoverButton = styled(ButtonBase)(({ theme }) => ({
  width: "100%",
  aspectRatio: "2 / 3",
  position: "relative",
  backgroundColor: theme.palette.action.hover,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  "& img": { width: "100%", height: "100%", objectFit: "contain" },
  "&:hover .cover-change, &.Mui-focusVisible .cover-change": { opacity: 1 },
}));
export const ProjectCoverChange = styled(Box)(({ theme }) => ({
  position: "absolute",
  bottom: 0,
  insetInline: 0,
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(1),
  opacity: 0,
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
  "@media (hover: none)": { opacity: 1 },
}));
export const ProjectCoverPlaceholder = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(1),
  color: theme.palette.text.secondary,
}));
export const ProjectCoverError = styled(Alert)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));
export const ProjectFileRow = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: theme.spacing(1, 0),
  borderBottom: `1px solid ${theme.palette.divider}`,
  "& img": { width: 40, height: 48, objectFit: "contain" },
}));
export const ProjectFileLink = styled(Box)({
  flex: 1,
  minWidth: 0,
  overflowWrap: "anywhere",
}) as typeof Box;


export const BookTitle = styled(Typography)(({ theme }) => ({
  fontSize: "1.5rem", fontWeight: 600, color: theme.palette.text.primary,
  overflowWrap: "anywhere", lineHeight: 1.3,
})) as typeof Typography;
export const BookIdentity = styled(Box)(({ theme }) => ({
  display: "flex", alignItems: "center", gap: theme.spacing(1.5), marginBottom: theme.spacing(1),
}));
export const BookTitleActions = styled(Box)({ marginLeft: "auto", flexShrink: 0 });
export const BookGroupsBar = styled(Box)(({ theme }) => ({
  display: "flex", alignItems: "center", gap: theme.spacing(1), flexWrap: "wrap",
  paddingBlock: theme.spacing(2), borderTop: `1px solid ${theme.palette.divider}`,
  "& > :last-child": { marginLeft: "auto" },
}));
export const BookGroupSelect = styled(Box)({ minWidth: 180, maxWidth: "100%" });
export const BookGrid = styled(Box, {
  shouldForwardProp: (prop) => prop !== "sourcesFocused",
})<{sourcesFocused: boolean}>(({ theme, sourcesFocused }) => ({
  display: "grid", alignItems: "start", gap: theme.spacing(3, 4),
  gridTemplateColumns: sourcesFocused ? "minmax(0,1fr)" : "minmax(0,1.35fr) minmax(0,1fr)",
  "& > *": { minWidth: 0 },
  "@container (max-width: 820px)": { gridTemplateColumns: "minmax(0,1fr)" },
}));
export const BookSupport = styled(Box, {
  shouldForwardProp: (prop) => prop !== "focused",
})<{focused: boolean}>(({ theme, focused }) => ({
  display: focused ? "grid" : "block", gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: theme.spacing(3,4), minWidth: 0,
  "& > *": { minWidth: 0 }, "& > :last-child": { gridColumn: "1 / -1" },
  "@container (max-width: 820px)": { display: "block" },
}));
export const BookSectionRoot = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`, marginBottom: theme.spacing(3), minWidth: 0,
})) as typeof Box;
export const BookSectionHeader = styled(Box)(({ theme }) => ({
  display: "flex", alignItems: "center", gap: theme.spacing(1), minHeight: 56,
  "& > :last-child:not(:first-child)": { marginLeft: "auto" },
}));
export const BookSectionToggle = styled(ButtonBase)(({ theme }) => ({
  display: "flex", alignItems: "center", gap: theme.spacing(1), textAlign: "left",
  paddingBlock: theme.spacing(1.5), minWidth: 0,
  "& .MuiTypography-root": { fontSize: "1rem", fontWeight: 500 },
  "& svg": { color: theme.palette.text.secondary },
  "& .navigation-chevron": { width: 16, height: 16, transition: "transform .15s", "&.collapsed": { transform: "rotate(-90deg)" } },
}));
export const BookSectionBody = styled(Box)(({ theme }) => ({paddingBottom: theme.spacing(1)}));
export const BookExport = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3), paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));
export const BookSourceDrop = styled(Box, {
  shouldForwardProp: (prop) => prop !== "dragging",
})<{dragging: boolean}>(({ theme, dragging }) => ({
  backgroundColor: dragging ? theme.palette.action.selected : "transparent",
  outline: dragging ? `2px dashed ${theme.palette.primary.main}` : "none",
  borderRadius: theme.shape.borderRadius,
}));
export const BookSourceRow = styled(ProjectFileRow)(({ theme }) => ({
  flexWrap: "nowrap", gap: theme.spacing(1), paddingBlock: theme.spacing(.5), minHeight: 48,
  "& .MuiTypography-root": { fontSize: ".9375rem" },
  "& .MuiTypography-caption": { fontSize: ".75rem" },
  "& .MuiCheckbox-root": { padding: theme.spacing(.5) },
  "& .MuiIconButton-root": { padding: theme.spacing(.75) },
}));
export const BookCleanRow = styled(BookSourceRow)(({ theme }) => ({paddingLeft: theme.spacing(2), "& > :first-child": { flex: 1, minWidth: 0 }}));
export const BookRowActions = styled(Box)(({ theme }) => ({
  display: "flex", alignItems: "center", gap: theme.spacing(.25), flexShrink: 0,
  "& .MuiIconButton-root": { padding: theme.spacing(.75), color: theme.palette.text.secondary },
}));
