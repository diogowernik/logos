"use client";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
export const HeaderTitleControls = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  minWidth: 0,
  columnGap: theme.spacing(3),
  rowGap: theme.spacing(1),
}));
export function HeaderActions({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}
    >
      {children}
    </Box>
  );
}
export function CompactActionButton({
  label,
  children,
  disabled = false,
  onClick,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton aria-label={label} disabled={disabled} onClick={onClick}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
