import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

export const EpubReaderHeading = styled(Box)(({ theme }) => ({
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: theme.spacing(2),
}));
export const EpubReaderLayout = styled(Box, {
  shouldForwardProp: (prop) => prop !== "tocOpen",
})<{ tocOpen: boolean }>(({ theme, tocOpen }) => ({
  display: "grid", gridTemplateColumns: tocOpen ? "minmax(180px, 240px) minmax(0, 1fr)" : "minmax(0, 1fr)",
  height: "70dvh", minHeight: 240, gap: theme.spacing(2),
  "& > nav": { overflowY: "auto", minHeight: 0 },
  [theme.breakpoints.down("sm")]: {
    gridTemplateColumns: "minmax(0, 1fr)",
    "& > [data-epub-viewport]": { display: tocOpen ? "none" : "block" },
  },
}));
export const EpubReaderViewport = styled(Box)({
  minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden",
});
