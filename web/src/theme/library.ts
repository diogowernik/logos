import { HeaderActions } from "@/components/ui/HeaderControls";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import ListSubheader from "@mui/material/ListSubheader";
import { alpha, styled } from "@mui/material/styles";

export const LibraryEmptyActions = styled(HeaderActions)(({ theme }) => ({
  justifyContent: "center",
  marginTop: theme.spacing(2),
  gap: theme.spacing(2),
}));

export const LibraryGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 160px))",
  gap: theme.spacing(3, 2),
  alignItems: "start",
}));

export const LibraryItemLink = styled(ButtonBase)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: theme.spacing(1),
  minWidth: 0,
  color: theme.palette.text.primary,
  textAlign: "left",
  textDecoration: "none",
  "&:hover": { textDecoration: "none" },
  "&:hover .library-item-title": { color: theme.palette.primary.main },
  "&.Mui-focusVisible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 4,
  },
})) as typeof ButtonBase;

export const LibraryItemCover = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "grid",
  placeItems: "center",
  aspectRatio: "2 / 3",
  backgroundColor: alpha(theme.palette.primary.main, 0.06),
  color: theme.palette.primary.main,
  fontSize: "2rem",
  "& img": {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
}));

export const LibraryCollectionCover = styled(Box)(({ theme }) => ({
  position: "relative",
  paddingRight: theme.spacing(1.5),
  paddingBottom: theme.spacing(1),
  isolation: "isolate",
  "&::before, &::after": {
    content: '""',
    position: "absolute",
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  "&::before": { inset: theme.spacing(1.5, 0, 0, 1.5) },
  "&::after": { inset: theme.spacing(0.75, 0.75, 0.5, 0.75) },
  "& > *": { zIndex: 1 },
}));

export const LibraryItemTitle = styled(Typography)({
  fontSize: "0.875rem",
  fontWeight: 400,
  lineHeight: 1.4,
  overflowWrap: "anywhere",
});

export const LibrarySearchTitle = styled(DialogTitle)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});
export const LibrarySearchContent = styled(DialogContent)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));
export const LibrarySearchField = styled(TextField)({
  "& .MuiInputBase-root": { fontSize: "1rem" },
});
export const LibrarySearchGroup = styled(ListSubheader)(({ theme }) => ({
  padding: theme.spacing(0, 1),
  fontSize: "0.875rem",
  fontWeight: 400,
  color: theme.palette.text.secondary,
}));
