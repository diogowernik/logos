"use client";
import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

export const CardGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  alignItems: "start",
  gap: theme.spacing(2),
  "& > *": { minWidth: 0 },
  [theme.breakpoints.down("md")]: { gridTemplateColumns: "minmax(0, 1fr)" },
  "@container (max-width: 820px)": { gridTemplateColumns: "minmax(0, 1fr)" },
}));

export const CardGridFullWidth = styled(Box)({
  gridColumn: "1 / -1",
  minWidth: 0,
});
