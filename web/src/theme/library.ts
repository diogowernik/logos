import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import ListSubheader from "@mui/material/ListSubheader";
import { alpha, styled } from "@mui/material/styles";

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
