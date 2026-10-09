import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Tabs from "@mui/material/Tabs";
import { styled } from "@mui/material/styles";
import { ReadingButton } from "./workspace";

export const ProjectDetails = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(2),
  flexWrap: "wrap",
}));
export const ProjectIdentity = styled(ProjectDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.app.surfaces.header,
  flexWrap: "nowrap",
}));
export const ProjectSummary = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));
export const ProjectTitleGroup = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  gap: theme.spacing(1),
}));
export const ProjectTitle = styled(Typography)(({ theme }) => ({
  fontSize: "1.125rem",
  fontWeight: 500,
  overflowWrap: "anywhere",
  color: theme.app.cardTitle,
})) as typeof Typography;
export const ProjectFeedback = styled(Typography)(({ theme }) => ({
  fontSize: "0.875rem",
  color: theme.palette.text.secondary,
}));
export const ProjectTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.app.surfaces.header,
  minHeight: 48,
  "& .MuiTab-root": {
    minHeight: 48,
    textTransform: "none",
    fontSize: "1rem",
    fontWeight: 400,
  },
}));
export const ProjectTabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  minWidth: 0,
  "&[hidden]": { display: "none" },
}));
export const ProjectPanelToolbar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: theme.spacing(1, 2),
  marginBottom: theme.spacing(1),
}));
export const ProjectPlannedTools = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));
export const ProjectEpubSections = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  "& > section + section": {
    borderTop: `1px solid ${theme.palette.divider}`,
    paddingTop: theme.spacing(2),
  },
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
