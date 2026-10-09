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
export const HeaderActions = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(1),
}));
export function CompactActionButton({
  label,
  tooltip,
  children,
  disabled = false,
  onClick,
}: {
  label: string;
  tooltip?: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip title={tooltip ?? label}>
      <span>
        <IconButton aria-label={label} disabled={disabled} onClick={onClick}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
