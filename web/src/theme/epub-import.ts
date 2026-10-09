import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { styled } from "@mui/material/styles";

export const ImportSourceSelect = styled(TextField)({ minWidth: 200, maxWidth: "100%", flex: 1 });
export const ImportWarningsLayout = styled(Box)({
  display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "start",
});
export const ImportSectionList = styled(Box)(({ theme }) => ({
  maxHeight: "45vh", overflowY: "auto", borderBlock: `1px solid ${theme.palette.divider}`,
}));
export const ImportSectionRow = styled(Box)(({ theme }) => ({
  display: "flex", alignItems: "flex-start", gap: theme.spacing(1),
  paddingBlock: theme.spacing(1), borderBottom: `1px solid ${theme.palette.divider}`,
}));
export const ImportSectionInfo = styled(Box)({ minWidth: 0, flex: 1, overflowWrap: "anywhere" });
export const ImportReviewLayout = styled(Box)(({ theme }) => ({
  display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", gap: theme.spacing(2),
  [theme.breakpoints.down("sm")]: { gridTemplateColumns: "minmax(0, 1fr)" },
}));
export const ImportPreviewList = styled(Box)(({ theme }) => ({
  maxHeight: "45vh", overflow: "auto", borderRight: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.down("sm")]: { maxHeight: 140, borderRight: 0, borderBottom: `1px solid ${theme.palette.divider}` },
}));
export const ImportPreviewDocument = styled(Box)(({ theme }) => ({
  minWidth: 0, maxHeight: "45vh", overflow: "auto", padding: theme.spacing(1),
  backgroundColor: theme.app.surfaces.reading,
  "& .markdown > :first-child": { marginTop: 0 },
  "& img": { maxWidth: "100%" },
})) as typeof Box;
export const ImportTechnicalReport = styled(Box)({
  whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "30vh", overflow: "auto",
  fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.8125rem", margin: 0,
}) as typeof Box;
